/**
 * Generate sample 3D brain volume data for visualization
 */

export interface BrainVolumeData {
  dimensions: [number, number, number];
  spacing: [number, number, number];
  origin: [number, number, number];
  data: Uint8Array;
  metadata: {
    patientName: string;
    patientId: string;
    studyDate: string;
    studyDescription: string;
    modality: string;
    seriesDescription: string;
  };
}

export class BrainVolumeGenerator {
  /**
   * Generate a synthetic brain volume with realistic structures
   */
  static generateBrainVolume(): BrainVolumeData {
    const dimensions: [number, number, number] = [256, 256, 128];
    const [width, height, depth] = dimensions;
    const data = new Uint8Array(width * height * depth);
    
    // Brain parameters
    const centerX = width / 2;
    const centerY = height / 2;
    const centerZ = depth / 2;
    
    // Generate brain structures
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = x + y * width + z * width * height;
          
          // Calculate distance from center
          const dx = (x - centerX) / (width / 2);
          const dy = (y - centerY) / (height / 2);
          const dz = (z - centerZ) / (depth / 2);
          
          // Ellipsoid shape for skull
          const skullDist = Math.sqrt(dx * dx * 0.9 + dy * dy + dz * dz * 1.5);
          
          // Brain tissue layers
          if (skullDist < 0.9) {
            // Inner brain structures
            const brainDist = Math.sqrt(dx * dx + dy * dy + dz * dz * 1.2);
            
            if (brainDist < 0.75) {
              // Gray matter and white matter
              const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * Math.sin(z * 0.15);
              const grayMatter = 120 + noise * 20;
              
              // Ventricles (fluid-filled spaces)
              const ventricleX = Math.abs(dx) < 0.15;
              const ventricleY = Math.abs(dy) < 0.2;
              const ventricleZ = Math.abs(dz) < 0.3;
              
              if (ventricleX && ventricleY && ventricleZ && brainDist < 0.3) {
                // CSF in ventricles (darker)
                data[index] = 30 + Math.random() * 10;
              } else if (brainDist < 0.5) {
                // Deep brain structures
                data[index] = 100 + noise * 15;
              } else {
                // Cortical gray matter
                data[index] = grayMatter;
              }
              
              // Add some anatomical features
              // Corpus callosum (connecting band)
              if (Math.abs(dy) < 0.05 && Math.abs(dz) < 0.1 && Math.abs(dx) < 0.4) {
                data[index] = 140 + Math.random() * 10;
              }
              
              // Brain stem
              if (Math.abs(dx) < 0.15 && dy > 0.3 && Math.abs(dz) < 0.2) {
                data[index] = 110 + Math.random() * 10;
              }
              
            } else if (skullDist < 0.85) {
              // Skull bone (bright)
              data[index] = 200 + Math.random() * 20;
            } else {
              // Outer skull/scalp
              data[index] = 160 + Math.random() * 10;
            }
          } else {
            // Background (air)
            data[index] = 0;
          }
        }
      }
    }
    
    // Apply smoothing filter for more realistic appearance
    const smoothedData = this.applySmoothingFilter(data, dimensions);
    
    return {
      dimensions,
      spacing: [1.0, 1.0, 1.5], // mm spacing typical for brain MRI
      origin: [-128, -128, -96],
      data: smoothedData,
      metadata: {
        patientName: 'Sample Brain Study',
        patientId: 'BRAIN-001',
        studyDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
        studyDescription: 'Brain MRI - T1 Weighted',
        modality: 'MR',
        seriesDescription: '3D T1-weighted MPRAGE'
      }
    };
  }
  
  /**
   * Apply 3D smoothing filter to make the volume more realistic
   */
  private static applySmoothingFilter(
    data: Uint8Array, 
    dimensions: [number, number, number]
  ): Uint8Array {
    const [width, height, depth] = dimensions;
    const smoothed = new Uint8Array(data.length);
    
    for (let z = 1; z < depth - 1; z++) {
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const index = x + y * width + z * width * height;
          
          // 3x3x3 kernel average
          let sum = 0;
          let count = 0;
          
          for (let dz = -1; dz <= 1; dz++) {
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                const nz = z + dz;
                const nIndex = nx + ny * width + nz * width * height;
                
                sum += data[nIndex];
                count++;
              }
            }
          }
          
          smoothed[index] = Math.round(sum / count);
        }
      }
    }
    
    // Copy edges
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (x === 0 || x === width - 1 || 
              y === 0 || y === height - 1 || 
              z === 0 || z === depth - 1) {
            const index = x + y * width + z * width * height;
            smoothed[index] = data[index];
          }
        }
      }
    }
    
    return smoothed;
  }
  
  /**
   * Generate cross-sectional slices for MPR view
   */
  static getSlice(
    data: Uint8Array,
    dimensions: [number, number, number],
    plane: 'axial' | 'sagittal' | 'coronal',
    sliceIndex: number
  ): Uint8Array {
    const [width, height, depth] = dimensions;
    
    switch (plane) {
      case 'axial': {
        // XY plane at Z = sliceIndex
        const slice = new Uint8Array(width * height);
        const z = Math.min(Math.max(0, sliceIndex), depth - 1);
        
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const srcIndex = x + y * width + z * width * height;
            const dstIndex = x + y * width;
            slice[dstIndex] = data[srcIndex];
          }
        }
        return slice;
      }
      
      case 'sagittal': {
        // YZ plane at X = sliceIndex
        const slice = new Uint8Array(height * depth);
        const x = Math.min(Math.max(0, sliceIndex), width - 1);
        
        for (let z = 0; z < depth; z++) {
          for (let y = 0; y < height; y++) {
            const srcIndex = x + y * width + z * width * height;
            const dstIndex = y + z * height;
            slice[dstIndex] = data[srcIndex];
          }
        }
        return slice;
      }
      
      case 'coronal': {
        // XZ plane at Y = sliceIndex
        const slice = new Uint8Array(width * depth);
        const y = Math.min(Math.max(0, sliceIndex), height - 1);
        
        for (let z = 0; z < depth; z++) {
          for (let x = 0; x < width; x++) {
            const srcIndex = x + y * width + z * width * height;
            const dstIndex = x + z * width;
            slice[dstIndex] = data[srcIndex];
          }
        }
        return slice;
      }
    }
  }
}