import * as dicomParser from 'dicom-parser';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface DicomMetadata {
  patientName?: string;
  patientId?: string;
  studyDate?: string;
  studyTime?: string;
  studyInstanceUID?: string;
  seriesInstanceUID?: string;
  sopInstanceUID?: string;
  modality?: string;
  studyDescription?: string;
  seriesDescription?: string;
  instanceNumber?: number;
  sliceLocation?: number;
  sliceThickness?: number;
  pixelSpacing?: [number, number];
  rows?: number;
  columns?: number;
  bitsAllocated?: number;
  bitsStored?: number;
  samplesPerPixel?: number;
  photometricInterpretation?: string;
  windowCenter?: number | number[];
  windowWidth?: number | number[];
  rescaleIntercept?: number;
  rescaleSlope?: number;
  kvp?: number;
  mas?: number;
  exposureTime?: number;
  xRayTubeCurrent?: number;
  imageOrientationPatient?: number[];
  imagePositionPatient?: number[];
  acquisitionDate?: string;
  acquisitionTime?: string;
  manufacturer?: string;
  manufacturerModelName?: string;
  softwareVersions?: string;
  institutionName?: string;
  stationName?: string;
}

export interface DicomSeries {
  seriesInstanceUID: string;
  seriesDescription: string;
  modality: string;
  seriesNumber: number;
  instances: DicomInstance[];
}

export interface DicomInstance {
  sopInstanceUID: string;
  instanceNumber: number;
  sliceLocation?: number;
  imagePositionPatient?: number[];
  filePath: string;
  metadata: DicomMetadata;
  pixelData?: ArrayBuffer;
  imageId: string;
}

export interface DicomStudy {
  studyInstanceUID: string;
  studyDescription: string;
  studyDate: string;
  patientName: string;
  patientId: string;
  series: DicomSeries[];
}

export class DicomService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'dicom');
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  async parseDicomFile(filePath: string): Promise<DicomMetadata> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const byteArray = new Uint8Array(fileBuffer);
      const dataSet = dicomParser.parseDicom(byteArray);

      const metadata: DicomMetadata = {
        patientName: this.getStringValue(dataSet, 'x00100010'),
        patientId: this.getStringValue(dataSet, 'x00100020'),
        studyDate: this.getStringValue(dataSet, 'x00080020'),
        studyTime: this.getStringValue(dataSet, 'x00080030'),
        studyInstanceUID: this.getStringValue(dataSet, 'x0020000d'),
        seriesInstanceUID: this.getStringValue(dataSet, 'x0020000e'),
        sopInstanceUID: this.getStringValue(dataSet, 'x00080018'),
        modality: this.getStringValue(dataSet, 'x00080060'),
        studyDescription: this.getStringValue(dataSet, 'x00081030'),
        seriesDescription: this.getStringValue(dataSet, 'x0008103e'),
        instanceNumber: this.getNumberValue(dataSet, 'x00200013'),
        sliceLocation: this.getNumberValue(dataSet, 'x00201041'),
        sliceThickness: this.getNumberValue(dataSet, 'x00180050'),
        rows: this.getNumberValue(dataSet, 'x00280010'),
        columns: this.getNumberValue(dataSet, 'x00280011'),
        bitsAllocated: this.getNumberValue(dataSet, 'x00280100'),
        bitsStored: this.getNumberValue(dataSet, 'x00280101'),
        samplesPerPixel: this.getNumberValue(dataSet, 'x00280002'),
        photometricInterpretation: this.getStringValue(dataSet, 'x00280004'),
        rescaleIntercept: this.getNumberValue(dataSet, 'x00281052'),
        rescaleSlope: this.getNumberValue(dataSet, 'x00281053'),
        kvp: this.getNumberValue(dataSet, 'x00180060'),
        mas: this.getNumberValue(dataSet, 'x00181152'),
        exposureTime: this.getNumberValue(dataSet, 'x00181150'),
        xRayTubeCurrent: this.getNumberValue(dataSet, 'x00181151'),
        acquisitionDate: this.getStringValue(dataSet, 'x00080022'),
        acquisitionTime: this.getStringValue(dataSet, 'x00080032'),
        manufacturer: this.getStringValue(dataSet, 'x00080070'),
        manufacturerModelName: this.getStringValue(dataSet, 'x00081090'),
        softwareVersions: this.getStringValue(dataSet, 'x00181020'),
        institutionName: this.getStringValue(dataSet, 'x00080080'),
        stationName: this.getStringValue(dataSet, 'x00081010'),
      };

      // Handle pixel spacing (can be array)
      const pixelSpacing = this.getStringValue(dataSet, 'x00280030');
      if (pixelSpacing) {
        const spacing = pixelSpacing.split('\\').map(Number);
        if (spacing.length >= 2) {
          metadata.pixelSpacing = [spacing[0], spacing[1]];
        }
      }

      // Handle window center/width (can be arrays)
      const windowCenter = this.getStringValue(dataSet, 'x00281050');
      const windowWidth = this.getStringValue(dataSet, 'x00281051');
      
      if (windowCenter) {
        const centers = windowCenter.split('\\').map(Number);
        metadata.windowCenter = centers.length === 1 ? centers[0] : centers;
      }
      
      if (windowWidth) {
        const widths = windowWidth.split('\\').map(Number);
        metadata.windowWidth = widths.length === 1 ? widths[0] : widths;
      }

      // Handle image orientation patient
      const imageOrientationPatient = this.getStringValue(dataSet, 'x00200037');
      if (imageOrientationPatient) {
        metadata.imageOrientationPatient = imageOrientationPatient.split('\\').map(Number);
      }

      // Handle image position patient
      const imagePositionPatient = this.getStringValue(dataSet, 'x00200032');
      if (imagePositionPatient) {
        metadata.imagePositionPatient = imagePositionPatient.split('\\').map(Number);
      }

      return metadata;
    } catch (error) {
      console.error('Error parsing DICOM file:', error);
      throw new Error(`Failed to parse DICOM file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractPixelData(filePath: string): Promise<ArrayBuffer> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const byteArray = new Uint8Array(fileBuffer);
      const dataSet = dicomParser.parseDicom(byteArray);

      const pixelDataElement = dataSet.elements.x7fe00010;
      if (!pixelDataElement) {
        throw new Error('No pixel data found in DICOM file');
      }

      return dataSet.byteArray.buffer.slice(
        pixelDataElement.dataOffset,
        pixelDataElement.dataOffset + pixelDataElement.length
      );
    } catch (error) {
      console.error('Error extracting pixel data:', error);
      throw new Error(`Failed to extract pixel data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processUploadedDicomFiles(files: any[]): Promise<DicomStudy[]> {
    const studiesMap = new Map<string, DicomStudy>();
    
    for (const file of files) {
      try {
        const metadata = await this.parseDicomFile(file.path);
        
        if (!metadata.studyInstanceUID) {
          console.warn(`Skipping file ${file.filename}: No study instance UID`);
          continue;
        }

        let study = studiesMap.get(metadata.studyInstanceUID);
        if (!study) {
          study = {
            studyInstanceUID: metadata.studyInstanceUID,
            studyDescription: metadata.studyDescription || 'Unknown Study',
            studyDate: metadata.studyDate || '',
            patientName: metadata.patientName || 'Unknown Patient',
            patientId: metadata.patientId || 'Unknown ID',
            series: []
          };
          studiesMap.set(metadata.studyInstanceUID, study);
        }

        const seriesUID = metadata.seriesInstanceUID || 'unknown-series';
        let series = study.series.find(s => s.seriesInstanceUID === seriesUID);
        if (!series) {
          series = {
            seriesInstanceUID: seriesUID,
            seriesDescription: metadata.seriesDescription || 'Unknown Series',
            modality: metadata.modality || 'OT',
            seriesNumber: study.series.length + 1,
            instances: []
          };
          study.series.push(series);
        }

        const instance: DicomInstance = {
          sopInstanceUID: metadata.sopInstanceUID || crypto.randomUUID(),
          instanceNumber: metadata.instanceNumber || series.instances.length + 1,
          sliceLocation: metadata.sliceLocation,
          imagePositionPatient: metadata.imagePositionPatient,
          filePath: file.path,
          metadata,
          imageId: `dicom:${file.path}`
        };

        series.instances.push(instance);
      } catch (error) {
        console.error(`Error processing file ${file.filename}:`, error);
      }
    }

    // Sort instances by instance number or slice location
    const studies = Array.from(studiesMap.values());
    for (const study of studies) {
      for (const series of study.series) {
        series.instances.sort((a: DicomInstance, b: DicomInstance) => {
          if (a.sliceLocation !== undefined && b.sliceLocation !== undefined) {
            return a.sliceLocation - b.sliceLocation;
          }
          return a.instanceNumber - b.instanceNumber;
        });
      }
    }

    return studies;
  }

  async getDicomImageAsBase64(filePath: string): Promise<string> {
    try {
      const pixelData = await this.extractPixelData(filePath);
      const metadata = await this.parseDicomFile(filePath);
      
      // Create a simple canvas-based image conversion
      // This is a basic implementation - in production you'd want more sophisticated processing
      const canvas = this.createCanvasFromPixelData(pixelData, metadata);
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error converting DICOM to base64:', error);
      throw error;
    }
  }

  private createCanvasFromPixelData(pixelData: ArrayBuffer, metadata: DicomMetadata): HTMLCanvasElement {
    // This is a simplified implementation
    // In a real scenario, you'd need proper pixel data processing based on:
    // - bits allocated/stored
    // - photometric interpretation
    // - rescale slope/intercept
    // - window/level settings
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx || !metadata.rows || !metadata.columns) {
      throw new Error('Invalid metadata for image creation');
    }
    
    canvas.width = metadata.columns;
    canvas.height = metadata.rows;
    
    // This is a placeholder - actual pixel data processing would be more complex
    const imageData = ctx.createImageData(metadata.columns, metadata.rows);
    
    // Fill with gray for now - real implementation would process actual pixel data
    for (let i = 0; i < imageData.data.length; i += 4) {
      const gray = 128; // Placeholder gray value
      imageData.data[i] = gray;     // R
      imageData.data[i + 1] = gray; // G
      imageData.data[i + 2] = gray; // B
      imageData.data[i + 3] = 255;  // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  private getStringValue(dataSet: any, tag: string): string | undefined {
    const element = dataSet.elements[tag];
    if (!element) return undefined;
    
    try {
      return dataSet.string(tag);
    } catch {
      return undefined;
    }
  }

  private getNumberValue(dataSet: any, tag: string): number | undefined {
    const element = dataSet.elements[tag];
    if (!element) return undefined;
    
    try {
      const value = dataSet.floatString(tag);
      return value ? parseFloat(value) : undefined;
    } catch {
      return undefined;
    }
  }

  async saveDicomFile(buffer: Buffer, originalName: string): Promise<string> {
    const fileName = `${Date.now()}-${originalName}`;
    const filePath = path.join(this.uploadDir, fileName);
    
    await fs.writeFile(filePath, buffer);
    return filePath;
  }

  async deleteDicomFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error deleting DICOM file:', error);
    }
  }
}

export const dicomService = new DicomService();