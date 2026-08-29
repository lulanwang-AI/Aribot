// Lung Volume Generator with Organ Segmentation and Tumor Detection
export class LungVolumeGenerator {
  static generateLungVolume() {
    const width = 256;
    const height = 256;
    const depth = 128;
    
    const volumeData = new Uint8Array(width * height * depth);
    
    // Generate anatomically accurate lung structure
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = x + y * width + z * width * height;
          
          // Normalize coordinates
          const nx = (x - width / 2) / (width / 2);
          const ny = (y - height / 2) / (height / 2);
          const nz = (z - depth / 2) / (depth / 2);
          
          // Generate lung shape (two lobes)
          const leftLungX = nx + 0.3;
          const rightLungX = nx - 0.3;
          
          // Left lung parameters
          const leftLungDist = Math.sqrt(
            leftLungX * leftLungX * 4 + 
            ny * ny * 1.5 + 
            nz * nz * 2
          );
          
          // Right lung parameters (slightly larger)
          const rightLungDist = Math.sqrt(
            rightLungX * rightLungX * 3.5 + 
            ny * ny * 1.4 + 
            nz * nz * 1.8
          );
          
          // Trachea and bronchi
          const tracheaDist = Math.sqrt(
            nx * nx * 25 + 
            (ny + 0.6) * (ny + 0.6) * 25 + 
            (nz + 0.3) * (nz + 0.3) * 10
          );
          
          // Heart cavity (mediastinum)
          const heartX = nx - 0.1;
          const heartY = ny + 0.2;
          const heartDist = Math.sqrt(
            heartX * heartX * 8 + 
            heartY * heartY * 6 + 
            nz * nz * 4
          );
          
          // Initialize voxel value
          let value = 0;
          
          // Lung tissue (air-filled, lower intensity)
          if (leftLungDist < 0.7 || rightLungDist < 0.7) {
            value = 30 + Math.random() * 20; // Low intensity for air-filled lungs
            
            // Add bronchial tree structure
            const bronchialNoise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * Math.sin(z * 0.05);
            if (bronchialNoise > 0.7) {
              value += 40; // Bronchial walls
            }
          }
          
          // Trachea (air-filled)
          if (tracheaDist < 0.15 && ny < -0.3) {
            value = 20; // Very low intensity for air
          }
          
          // Tracheal walls
          if (tracheaDist >= 0.15 && tracheaDist < 0.18 && ny < -0.3) {
            value = 150; // Higher intensity for tissue
          }
          
          // Heart region (exclude from lungs)
          if (heartDist < 0.35 && ny > -0.1) {
            value = 180 + Math.random() * 20; // Heart tissue
          }
          
          // Ribs (periodic structure)
          const ribPattern = Math.sin(y * 0.15) * Math.cos(z * 0.3);
          if (ribPattern > 0.85 && Math.abs(nx) > 0.6) {
            value = 250; // Bone intensity
          }
          
          // Add some lung nodules/tumors at specific locations
          // Tumor 1: Right upper lobe
          const tumor1Dist = Math.sqrt(
            Math.pow(x - 180, 2) + 
            Math.pow(y - 80, 2) + 
            Math.pow(z - 40, 2)
          );
          if (tumor1Dist < 12) {
            value = 200 + Math.random() * 30; // High intensity tumor
          }
          
          // Tumor 2: Left lower lobe  
          const tumor2Dist = Math.sqrt(
            Math.pow(x - 70, 2) + 
            Math.pow(y - 160, 2) + 
            Math.pow(z - 80, 2)
          );
          if (tumor2Dist < 8) {
            value = 210 + Math.random() * 25; // High intensity tumor
          }
          
          // Small nodule
          const noduleDist = Math.sqrt(
            Math.pow(x - 150, 2) + 
            Math.pow(y - 120, 2) + 
            Math.pow(z - 60, 2)
          );
          if (noduleDist < 5) {
            value = 180 + Math.random() * 20; // Moderate intensity nodule
          }
          
          // Pulmonary vessels
          const vesselNoise = Math.sin(x * 0.05 + z * 0.1) * Math.cos(y * 0.05);
          if (vesselNoise > 0.8 && value > 20 && value < 100) {
            value += 60; // Blood vessels
          }
          
          // Add texture and noise
          value += (Math.random() - 0.5) * 10;
          
          // Clamp values
          volumeData[index] = Math.max(0, Math.min(255, Math.round(value)));
        }
      }
    }
    
    return {
      data: volumeData,
      dimensions: [width, height, depth],
      spacing: [1.0, 1.0, 2.0], // mm spacing between voxels
      origin: [0, 0, 0],
      metadata: {
        modality: 'CT',
        studyDescription: 'Chest CT with Lung Segmentation',
        patientName: 'Sample Patient',
        acquisitionDate: new Date().toISOString().split('T')[0],
        windowCenter: 40,
        windowWidth: 350,
        annotations: [
          {
            type: 'tumor',
            location: [180, 80, 40],
            label: 'Primary Tumor (2.4cm)',
            severity: 'high',
            confidence: 0.92
          },
          {
            type: 'tumor', 
            location: [70, 160, 80],
            label: 'Secondary Tumor (1.6cm)',
            severity: 'moderate',
            confidence: 0.88
          },
          {
            type: 'nodule',
            location: [150, 120, 60],
            label: 'Benign Nodule (0.5cm)',
            severity: 'low',
            confidence: 0.75
          }
        ],
        organs: [
          {
            name: 'Right Lung',
            color: '#4A90E2',
            bounds: { x: [128, 256], y: [40, 200], z: [20, 108] }
          },
          {
            name: 'Left Lung',
            color: '#7ED321',
            bounds: { x: [0, 128], y: [40, 200], z: [20, 108] }
          },
          {
            name: 'Trachea',
            color: '#F5A623',
            bounds: { x: [110, 146], y: [20, 80], z: [30, 70] }
          },
          {
            name: 'Heart',
            color: '#D0021B',
            bounds: { x: [80, 176], y: [120, 180], z: [40, 88] }
          }
        ],
        aiAnalysis: {
          algorithm: 'Deep Learning CNN v3.2',
          processingTime: '2.3s',
          findings: [
            'Detected 2 suspicious masses requiring further investigation',
            'Right upper lobe mass (2.4cm) - HIGH priority',
            'Left lower lobe mass (1.6cm) - MODERATE priority', 
            'Small benign-appearing nodule in right middle lobe',
            'No pleural effusion detected',
            'No pneumothorax identified'
          ],
          lungRADS: '4A',
          recommendedAction: 'CT chest with contrast in 3 months or PET/CT'
        }
      }
    };
  }
  
  static generateSlice(sliceIndex: number, orientation: 'axial' | 'sagittal' | 'coronal' = 'axial') {
    const fullVolume = this.generateLungVolume();
    const [width, height, depth] = fullVolume.dimensions;
    
    let sliceData: Uint8Array;
    let sliceWidth: number;
    let sliceHeight: number;
    
    switch (orientation) {
      case 'axial':
        sliceWidth = width;
        sliceHeight = height;
        sliceData = new Uint8Array(sliceWidth * sliceHeight);
        
        const z = Math.min(sliceIndex, depth - 1);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const volumeIndex = x + y * width + z * width * height;
            const sliceDataIndex = x + y * sliceWidth;
            sliceData[sliceDataIndex] = fullVolume.data[volumeIndex];
          }
        }
        break;
        
      case 'sagittal':
        sliceWidth = height;
        sliceHeight = depth;
        sliceData = new Uint8Array(sliceWidth * sliceHeight);
        
        const x = Math.min(sliceIndex, width - 1);
        for (let z = 0; z < depth; z++) {
          for (let y = 0; y < height; y++) {
            const volumeIndex = x + y * width + z * width * height;
            const sliceDataIndex = y + z * sliceWidth;
            sliceData[sliceDataIndex] = fullVolume.data[volumeIndex];
          }
        }
        break;
        
      case 'coronal':
        sliceWidth = width;
        sliceHeight = depth;
        sliceData = new Uint8Array(sliceWidth * sliceHeight);
        
        const y = Math.min(sliceIndex, height - 1);
        for (let z = 0; z < depth; z++) {
          for (let x = 0; x < width; x++) {
            const volumeIndex = x + y * width + z * width * height;
            const sliceDataIndex = x + z * sliceWidth;
            sliceData[sliceDataIndex] = fullVolume.data[volumeIndex];
          }
        }
        break;
    }
    
    return {
      data: sliceData,
      width: sliceWidth,
      height: sliceHeight,
      metadata: fullVolume.metadata
    };
  }
}