import fs from 'fs';
import path from 'path';
import * as dicomParser from 'dicom-parser';

export interface SampleDicomFile {
  filename: string;
  path: string;
  size: number;
  metadata?: {
    patientName?: string;
    patientId?: string;
    studyDescription?: string;
    studyDate?: string;
    modality?: string;
    seriesDescription?: string;
    studyInstanceUID?: string;
    seriesInstanceUID?: string;
    sopInstanceUID?: string;
    instanceNumber?: number;
    sliceLocation?: number;
  };
}

export class SampleDicomService {
  private sampleDicomPath = path.join(process.cwd(), 'public', 'sample-dicom');

  async getSampleDicomFiles(): Promise<SampleDicomFile[]> {
    try {
      const files = await fs.promises.readdir(this.sampleDicomPath);
      const dicomFiles = files.filter(f => f.endsWith('.dcm'));
      
      const sampleFiles: SampleDicomFile[] = [];
      
      for (const filename of dicomFiles) {
        const filePath = path.join(this.sampleDicomPath, filename);
        const stats = await fs.promises.stat(filePath);
        
        try {
          const fileBuffer = await fs.promises.readFile(filePath);
          const byteArray = new Uint8Array(fileBuffer);
          const dataSet = dicomParser.parseDicom(byteArray);
          
          const metadata = {
            patientName: this.getStringValue(dataSet, 'x00100010'),
            patientId: this.getStringValue(dataSet, 'x00100020'),
            studyDescription: this.getStringValue(dataSet, 'x00081030'),
            studyDate: this.getStringValue(dataSet, 'x00080020'),
            modality: this.getStringValue(dataSet, 'x00080060'),
            seriesDescription: this.getStringValue(dataSet, 'x0008103e'),
            studyInstanceUID: this.getStringValue(dataSet, 'x0020000d'),
            seriesInstanceUID: this.getStringValue(dataSet, 'x0020000e'),
            sopInstanceUID: this.getStringValue(dataSet, 'x00080018'),
            instanceNumber: dataSet.intString('x00200013'),
            sliceLocation: dataSet.floatString('x00201041')
          };
          
          sampleFiles.push({
            filename,
            path: `/sample-dicom/${filename}`,
            size: stats.size,
            metadata
          });
        } catch (parseError) {
          // If parsing fails, still include the file without metadata
          sampleFiles.push({
            filename,
            path: `/sample-dicom/${filename}`,
            size: stats.size
          });
        }
      }
      
      // Sort by instance number if available
      sampleFiles.sort((a, b) => {
        const aNum = a.metadata?.instanceNumber || 0;
        const bNum = b.metadata?.instanceNumber || 0;
        return aNum - bNum;
      });
      
      return sampleFiles;
    } catch (error) {
      console.error('Error reading sample DICOM files:', error);
      return [];
    }
  }

  private getStringValue(dataSet: any, tag: string): string | undefined {
    try {
      const value = dataSet.string(tag);
      return value ? value.trim() : undefined;
    } catch {
      return undefined;
    }
  }

  async getSampleDicomStudies(): Promise<any[]> {
    const files = await this.getSampleDicomFiles();
    
    // Group files by study
    const studiesMap = new Map<string, any>();
    
    for (const file of files) {
      if (!file.metadata?.studyInstanceUID) continue;
      
      const studyUID = file.metadata.studyInstanceUID;
      
      if (!studiesMap.has(studyUID)) {
        studiesMap.set(studyUID, {
          studyInstanceUID: studyUID,
          studyDescription: file.metadata.studyDescription || 'Sample Study',
          studyDate: file.metadata.studyDate || new Date().toISOString().split('T')[0],
          patientName: file.metadata.patientName || 'Sample Patient',
          patientId: file.metadata.patientId || 'SAMPLE001',
          modality: file.metadata.modality || 'CT',
          series: new Map()
        });
      }
      
      const study = studiesMap.get(studyUID);
      const seriesUID = file.metadata.seriesInstanceUID || 'default-series';
      
      if (!study.series.has(seriesUID)) {
        study.series.set(seriesUID, {
          seriesInstanceUID: seriesUID,
          seriesDescription: file.metadata.seriesDescription || 'Sample Series',
          modality: file.metadata.modality || 'CT',
          seriesNumber: study.series.size + 1,
          instances: []
        });
      }
      
      const series = study.series.get(seriesUID);
      series.instances.push({
        sopInstanceUID: file.metadata.sopInstanceUID,
        instanceNumber: file.metadata.instanceNumber || series.instances.length + 1,
        path: file.path,
        filename: file.filename
      });
    }
    
    // Convert maps to arrays
    const studies = Array.from(studiesMap.values()).map(study => ({
      ...study,
      series: Array.from(study.series.values()).map(series => ({
        ...series,
        instanceCount: series.instances.length
      }))
    }));
    
    return studies;
  }

  async loadSampleDicomAsBuffer(filename: string): Promise<Buffer> {
    const filePath = path.join(this.sampleDicomPath, filename);
    return fs.promises.readFile(filePath);
  }
}

export const sampleDicomService = new SampleDicomService();