import * as fs from 'fs';
import * as path from 'path';

export interface DicomMetadata {
  patientName?: string;
  patientId?: string;
  studyDate?: string;
  studyTime?: string;
  studyDescription?: string;
  seriesDescription?: string;
  modality?: string;
  instanceNumber?: number;
  sliceLocation?: number;
  sliceThickness?: number;
  pixelSpacing?: [number, number];
  imagePositionPatient?: [number, number, number];
  imageOrientationPatient?: number[];
  windowCenter?: number;
  windowWidth?: number;
  rescaleIntercept?: number;
  rescaleSlope?: number;
  bitsAllocated?: number;
  bitsStored?: number;
  highBit?: number;
  pixelRepresentation?: number;
  photometricInterpretation?: string;
  rows?: number;
  columns?: number;
  samplesPerPixel?: number;
}

export interface ProcessedDicomSlice {
  metadata: DicomMetadata;
  pixelData: Uint16Array | Int16Array;
  imageData: Uint8Array;
  width: number;
  height: number;
  sliceLocation: number;
  instanceNumber: number;
  filename: string;
}

export interface DicomSeries {
  seriesInstanceUID: string;
  studyInstanceUID: string;
  seriesDescription: string;
  modality: string;
  slices: ProcessedDicomSlice[];
  metadata: DicomMetadata;
}

export interface DicomVolume {
  series: DicomSeries[];
  patientInfo: {
    name: string;
    id: string;
    studyDate: string;
    studyDescription: string;
  };
  volumeData: {
    dimensions: [number, number, number];
    spacing: [number, number, number];
    origin: [number, number, number];
    data: Uint16Array | Int16Array;
  };
}

export class DicomProcessor {
  private dicomDirectory: string;

  constructor(dicomDirectory: string = './attached_assets') {
    this.dicomDirectory = dicomDirectory;
  }

  /**
   * Process all DICOM files in the directory and create a 3D volume
   */
  async processDicomDirectory(): Promise<DicomVolume> {
    const dicomFiles = this.findDicomFiles();
    const processedSlices: ProcessedDicomSlice[] = [];

    for (const filename of dicomFiles) {
      try {
        const slice = await this.processDicomFile(filename);
        if (slice) {
          processedSlices.push(slice);
        }
      } catch (error) {
        console.warn(`Failed to process DICOM file ${filename}:`, error);
      }
    }

    if (processedSlices.length === 0) {
      throw new Error('No valid DICOM files found');
    }

    // Group slices by series
    const seriesMap = new Map<string, ProcessedDicomSlice[]>();
    
    processedSlices.forEach(slice => {
      const seriesUID = slice.metadata.seriesDescription || 'unknown';
      if (!seriesMap.has(seriesUID)) {
        seriesMap.set(seriesUID, []);
      }
      seriesMap.get(seriesUID)!.push(slice);
    });

    // Create series objects
    const series: DicomSeries[] = [];
    
    for (const [seriesUID, slices] of Array.from(seriesMap.entries())) {
      // Sort slices by instance number or slice location
      slices.sort((a: ProcessedDicomSlice, b: ProcessedDicomSlice) => {
        if (a.instanceNumber !== undefined && b.instanceNumber !== undefined) {
          return a.instanceNumber - b.instanceNumber;
        }
        return a.sliceLocation - b.sliceLocation;
      });

      series.push({
        seriesInstanceUID: seriesUID,
        studyInstanceUID: slices[0].metadata.studyDescription || 'unknown',
        seriesDescription: slices[0].metadata.seriesDescription || 'CT Series',
        modality: slices[0].metadata.modality || 'CT',
        slices,
        metadata: slices[0].metadata
      });
    }

    // Create volume data from the first (or largest) series
    const primarySeries = series.reduce((largest, current) => 
      current.slices.length > largest.slices.length ? current : largest
    );

    const volumeData = this.createVolumeData(primarySeries);

    return {
      series,
      patientInfo: {
        name: primarySeries.slices[0].metadata.patientName || 'Unknown Patient',
        id: primarySeries.slices[0].metadata.patientId || 'Unknown ID',
        studyDate: primarySeries.slices[0].metadata.studyDate || new Date().toISOString().split('T')[0],
        studyDescription: primarySeries.slices[0].metadata.studyDescription || 'CT Study'
      },
      volumeData
    };
  }

  /**
   * Find all DICOM files in the directory
   */
  private findDicomFiles(): string[] {
    try {
      const files = fs.readdirSync(this.dicomDirectory);
      return files.filter(file => 
        file.toLowerCase().endsWith('.dcm') || 
        file.toLowerCase().endsWith('.dicom') ||
        file.toLowerCase().includes('image-')
      );
    } catch (error) {
      console.error('Error reading DICOM directory:', error);
      return [];
    }
  }

  /**
   * Process a single DICOM file
   */
  async processDicomFile(filename: string): Promise<ProcessedDicomSlice | null> {
    const filepath = path.join(this.dicomDirectory, filename);
    
    try {
      const { default: dicomParser } = await import('dicom-parser');
      const dicomData = fs.readFileSync(filepath);
      const dataSet = dicomParser.parseDicom(dicomData);

      // Extract metadata
      const metadata = this.extractMetadata(dataSet);
      
      // Extract pixel data
      const pixelData = this.extractPixelData(dataSet, metadata);
      if (!pixelData) {
        console.warn(`No pixel data found in ${filename}`);
        return null;
      }

      // Convert to displayable image data
      const imageData = this.convertToImageData(pixelData, metadata);

      return {
        metadata,
        pixelData,
        imageData,
        width: metadata.columns || 512,
        height: metadata.rows || 512,
        sliceLocation: metadata.sliceLocation || 0,
        instanceNumber: metadata.instanceNumber || 0,
        filename
      };
    } catch (error) {
      console.error(`Error processing DICOM file ${filename}:`, error);
      return null;
    }
  }

  /**
   * Extract metadata from DICOM dataset
   */
  private extractMetadata(dataSet: any): DicomMetadata {
    const getString = (tag: string): string | undefined => {
      try {
        return dataSet.string(tag);
      } catch {
        return undefined;
      }
    };

    const getNumber = (tag: string): number | undefined => {
      try {
        const value = dataSet.string(tag);
        return value ? parseFloat(value) : undefined;
      } catch {
        return undefined;
      }
    };

    const getNumberArray = (tag: string): number[] | undefined => {
      try {
        const value = dataSet.string(tag);
        return value ? value.split('\\').map((v: string) => parseFloat(v.trim())) : undefined;
      } catch {
        return undefined;
      }
    };

    return {
      patientName: getString('x00100010'),
      patientId: getString('x00100020'),
      studyDate: getString('x00080020'),
      studyTime: getString('x00080030'),
      studyDescription: getString('x00081030'),
      seriesDescription: getString('x0008103e'),
      modality: getString('x00080060'),
      instanceNumber: getNumber('x00200013'),
      sliceLocation: getNumber('x00201041'),
      sliceThickness: getNumber('x00180050'),
      pixelSpacing: getNumberArray('x00280030') as [number, number],
      imagePositionPatient: getNumberArray('x00200032') as [number, number, number],
      imageOrientationPatient: getNumberArray('x00200037'),
      windowCenter: getNumber('x00281050'),
      windowWidth: getNumber('x00281051'),
      rescaleIntercept: getNumber('x00281052'),
      rescaleSlope: getNumber('x00281053'),
      bitsAllocated: getNumber('x00280100'),
      bitsStored: getNumber('x00280101'),
      highBit: getNumber('x00280102'),
      pixelRepresentation: getNumber('x00280103'),
      photometricInterpretation: getString('x00280004'),
      rows: getNumber('x00280010'),
      columns: getNumber('x00280011'),
      samplesPerPixel: getNumber('x00280002')
    };
  }

  /**
   * Extract pixel data from DICOM dataset
   */
  private extractPixelData(dataSet: any, metadata: DicomMetadata): Uint16Array | Int16Array | null {
    try {
      const pixelDataElement = dataSet.elements.x7fe00010;
      if (!pixelDataElement) {
        return null;
      }

      const pixelData = new Uint8Array(dataSet.byteArray.buffer, 
        pixelDataElement.dataOffset, 
        pixelDataElement.length
      );

      const rows = metadata.rows || 512;
      const columns = metadata.columns || 512;
      const bitsAllocated = metadata.bitsAllocated || 16;
      const pixelRepresentation = metadata.pixelRepresentation || 0;

      if (bitsAllocated === 16) {
        if (pixelRepresentation === 0) {
          // Unsigned 16-bit
          const result = new Uint16Array(rows * columns);
          for (let i = 0; i < result.length; i++) {
            result[i] = pixelData[i * 2] | (pixelData[i * 2 + 1] << 8);
          }
          return result;
        } else {
          // Signed 16-bit
          const result = new Int16Array(rows * columns);
          for (let i = 0; i < result.length; i++) {
            result[i] = pixelData[i * 2] | (pixelData[i * 2 + 1] << 8);
          }
          return result;
        }
      } else {
        // 8-bit data
        const result = new Uint16Array(rows * columns);
        for (let i = 0; i < result.length; i++) {
          result[i] = pixelData[i];
        }
        return result;
      }
    } catch (error) {
      console.error('Error extracting pixel data:', error);
      return null;
    }
  }

  /**
   * Convert pixel data to displayable image data with windowing
   */
  private convertToImageData(pixelData: Uint16Array | Int16Array, metadata: DicomMetadata): Uint8Array {
    const rescaleSlope = metadata.rescaleSlope || 1;
    const rescaleIntercept = metadata.rescaleIntercept || 0;
    const windowCenter = metadata.windowCenter || 50;
    const windowWidth = metadata.windowWidth || 350;

    const imageData = new Uint8Array(pixelData.length);

    const minWindow = windowCenter - windowWidth / 2;
    const maxWindow = windowCenter + windowWidth / 2;

    for (let i = 0; i < pixelData.length; i++) {
      // Apply rescale slope and intercept
      let value = pixelData[i] * rescaleSlope + rescaleIntercept;

      // Apply windowing
      if (value <= minWindow) {
        imageData[i] = 0;
      } else if (value >= maxWindow) {
        imageData[i] = 255;
      } else {
        imageData[i] = Math.round(((value - minWindow) / windowWidth) * 255);
      }
    }

    return imageData;
  }

  /**
   * Create 3D volume data from a series of slices
   */
  private createVolumeData(series: DicomSeries) {
    const slices = series.slices;
    if (slices.length === 0) {
      throw new Error('No slices available for volume creation');
    }

    const firstSlice = slices[0];
    const width = firstSlice.width;
    const height = firstSlice.height;
    const depth = slices.length;

    // Create volume data array
    const volumeData = new Uint16Array(width * height * depth);

    // Fill volume data
    slices.forEach((slice, index) => {
      const sliceOffset = index * width * height;
      const sliceData = slice.pixelData;
      
      for (let i = 0; i < sliceData.length; i++) {
        volumeData[sliceOffset + i] = sliceData[i];
      }
    });

    // Calculate spacing
    const pixelSpacing = firstSlice.metadata.pixelSpacing || [1, 1];
    const sliceThickness = firstSlice.metadata.sliceThickness || 1;
    
    // Calculate origin from image position
    const imagePosition = firstSlice.metadata.imagePositionPatient || [0, 0, 0];

    return {
      dimensions: [width, height, depth] as [number, number, number],
      spacing: [pixelSpacing[0], pixelSpacing[1], sliceThickness] as [number, number, number],
      origin: imagePosition as [number, number, number],
      data: volumeData
    };
  }

  /**
   * Get series information for a processed volume
   */
  getSeriesInfo(volume: DicomVolume): any[] {
    return volume.series.map(series => ({
      seriesInstanceUID: series.seriesInstanceUID,
      seriesDescription: series.seriesDescription,
      modality: series.modality,
      sliceCount: series.slices.length,
      firstSliceLocation: series.slices[0]?.sliceLocation || 0,
      lastSliceLocation: series.slices[series.slices.length - 1]?.sliceLocation || 0,
      spacing: series.slices[0]?.metadata.pixelSpacing || [1, 1],
      sliceThickness: series.slices[0]?.metadata.sliceThickness || 1
    }));
  }

  /**
   * Extract a specific slice for 2D viewing
   */
  getSliceData(volume: DicomVolume, seriesIndex: number = 0, sliceIndex: number = 0) {
    const series = volume.series[seriesIndex];
    if (!series || !series.slices[sliceIndex]) {
      return null;
    }

    const slice = series.slices[sliceIndex];
    return {
      imageData: slice.imageData,
      pixelData: slice.pixelData,
      width: slice.width,
      height: slice.height,
      metadata: slice.metadata,
      filename: slice.filename
    };
  }
}