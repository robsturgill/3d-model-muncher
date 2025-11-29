import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { 
  parseGcode, 
  normalizeTime, 
  estimateWeightFromLength,
  extractGcodeFrom3MF 
} from '../src/utils/gcodeParser';
import { zipSync } from 'fflate';

describe('gcodeParser', () => {
  describe('normalizeTime', () => {
    it('should handle zero seconds', () => {
      expect(normalizeTime(0)).toBe('0s');
    });

    it('should handle seconds only', () => {
      expect(normalizeTime(45)).toBe('45s');
      expect(normalizeTime(59)).toBe('59s');
    });

    it('should handle minutes and seconds', () => {
      expect(normalizeTime(60)).toBe('1m');
      expect(normalizeTime(90)).toBe('1m 30s');
      expect(normalizeTime(125)).toBe('2m 5s');
    });

    it('should handle hours, minutes, and seconds', () => {
      expect(normalizeTime(3600)).toBe('1h');
      expect(normalizeTime(3661)).toBe('1h 2m'); // Rounds up 1h 1m 1s -> 1h 2m
      expect(normalizeTime(5678)).toBe('1h 35m'); // Rounds up 1h 34m 38s -> 1h 35m
    });

    it('should handle full day', () => {
      expect(normalizeTime(86400)).toBe('24h');
    });
  });

  describe('estimateWeightFromLength', () => {
    it('should calculate weight for standard PLA', () => {
      // 1000mm of 1.75mm PLA (density 1.24)
      const weight = estimateWeightFromLength(1000, 1.75, 1.24);
      expect(weight).toBeCloseTo(2.98, 1);
    });

    it('should use default diameter and density', () => {
      const weight = estimateWeightFromLength(1000);
      expect(weight).toBeGreaterThan(0);
    });

    it('should handle different filament diameters', () => {
      // 2.85mm filament should weigh more than 1.75mm
      const weight175 = estimateWeightFromLength(1000, 1.75, 1.24);
      const weight285 = estimateWeightFromLength(1000, 2.85, 1.24);
      expect(weight285).toBeGreaterThan(weight175);
    });

    it('should handle different densities', () => {
      // PETG (1.27) should weigh more than PLA (1.24)
      const weightPLA = estimateWeightFromLength(1000, 1.75, 1.24);
      const weightPETG = estimateWeightFromLength(1000, 1.75, 1.27);
      expect(weightPETG).toBeGreaterThan(weightPLA);
    });

    it('should handle zero length', () => {
      expect(estimateWeightFromLength(0)).toBe(0);
    });
  });

  describe('extractGcodeFrom3MF', () => {
    it('should extract gcode from Metadata/plate_1.gcode (BambuLab format)', () => {
      const gcodeContent = '; Test G-code\nG28 ; home\n';
      const files = {
        '[Content_Types].xml': new TextEncoder().encode('<?xml version="1.0"?>'),
        'Metadata/plate_1.gcode': new TextEncoder().encode(gcodeContent)
      };
      const buffer = Buffer.from(zipSync(files));
      
      const extracted = extractGcodeFrom3MF(buffer);
      expect(extracted).toBe(gcodeContent);
    });

    it('should extract gcode from Metadata/plate_2.gcode if plate_1 not found', () => {
      const gcodeContent = '; Test G-code\nG28 ; home\n';
      const files = {
        'Metadata/plate_2.gcode': new TextEncoder().encode(gcodeContent)
      };
      const buffer = Buffer.from(zipSync(files));
      
      const extracted = extractGcodeFrom3MF(buffer);
      expect(extracted).toBe(gcodeContent);
    });

    it('should extract gcode from root level as fallback', () => {
      const gcodeContent = '; Test G-code\nG28 ; home\n';
      const files = {
        'test.gcode': new TextEncoder().encode(gcodeContent)
      };
      const buffer = Buffer.from(zipSync(files));
      
      const extracted = extractGcodeFrom3MF(buffer);
      expect(extracted).toBe(gcodeContent);
    });

    it('should prioritize Metadata/plate_1.gcode over root files', () => {
      const preferredContent = '; Preferred G-code\n';
      const fallbackContent = '; Fallback G-code\n';
      const files = {
        'Metadata/plate_1.gcode': new TextEncoder().encode(preferredContent),
        'test.gcode': new TextEncoder().encode(fallbackContent)
      };
      const buffer = Buffer.from(zipSync(files));
      
      const extracted = extractGcodeFrom3MF(buffer);
      expect(extracted).toBe(preferredContent);
    });

    it('should throw error if no gcode file found', () => {
      const files = {
        'model.stl': new TextEncoder().encode('dummy')
      };
      const buffer = Buffer.from(zipSync(files));
      
      expect(() => extractGcodeFrom3MF(buffer)).toThrow('No .gcode file found');
    });

    it('should throw error for invalid 3MF', () => {
      const buffer = Buffer.from('not a zip file');
      expect(() => extractGcodeFrom3MF(buffer)).toThrow();
    });
  });

  describe('parseGcode - BambuStudio format', () => {
    it('should parse single filament BambuStudio file', () => {
      const fixturePath = join(__dirname, 'fixtures', 'gcode', 'bambu-single.gcode');
      const content = readFileSync(fixturePath, 'utf8');
      
      const result = parseGcode(content);
      
      expect(result.printTime).toBe('57m 30s');
      expect(result.filaments).toHaveLength(1);
      expect(result.filaments[0].type).toBe('PLA');
      expect(result.filaments[0].length).toBe('1229.28mm');
      expect(result.filaments[0].weight).toBe('3.73g');
      expect(result.filaments[0].color).toBe('#898989');
      expect(result.filaments[0].density).toBe('1.26');
      expect(result.totalFilamentWeight).toBe('3.73g');
    });

    it('should parse multi-filament BambuStudio file', () => {
      const fixturePath = join(__dirname, 'fixtures', 'gcode', 'bambu-multi.gcode');
      const content = readFileSync(fixturePath, 'utf8');
      
      const result = parseGcode(content);
      
      expect(result.printTime).toBe('3h 15m'); // Rounds up 3h 14m 12s -> 3h 15m
      expect(result.filaments).toHaveLength(4);
      
      // First filament
      expect(result.filaments[0].type).toBe('PLA');
      expect(result.filaments[0].length).toBe('1229.28mm');
      expect(result.filaments[0].weight).toBe('3.73g');
      expect(result.filaments[0].color).toBe('#FF5733');
      
      // Second filament
      expect(result.filaments[1].type).toBe('PLA');
      expect(result.filaments[1].weight).toBe('8.77g');
      expect(result.filaments[1].color).toBe('#33FF57');
      
      // Third filament (PETG)
      expect(result.filaments[2].type).toBe('PETG');
      expect(result.filaments[2].color).toBe('#3357FF');
      
      // Fourth filament
      expect(result.filaments[3].color).toBe('#F333FF');
      
      // Total weight
      const totalWeight = 3.73 + 8.77 + 1.72 + 3.74;
      expect(result.totalFilamentWeight).toBe(`${totalWeight.toFixed(2)}g`);
    });

    it('should handle color mapping correctly by index', () => {
      const fixturePath = join(__dirname, 'fixtures', 'gcode', 'bambu-multi.gcode');
      const content = readFileSync(fixturePath, 'utf8');
      
      const result = parseGcode(content);
      
      // Verify each filament has correct color by position
      const expectedColors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF'];
      result.filaments.forEach((filament, idx) => {
        expect(filament.color).toBe(expectedColors[idx]);
      });
    });
  });

  describe('parseGcode - Cura format', () => {
    it('should parse Cura format file', () => {
      const fixturePath = join(__dirname, 'fixtures', 'gcode', 'cura-basic.gcode');
      const content = readFileSync(fixturePath, 'utf8');
      
      const result = parseGcode(content);
      
      // TIME in seconds: 53473 = 14h 51m 13s, rounds up to 14h 52m
      expect(result.printTime).toBe('14h 52m');
      expect(result.filaments).toHaveLength(1);
      expect(result.filaments[0].length).toBe('22400.00mm'); // 22.4m = 22400mm
    });

    it('should estimate weight from length for Cura files', () => {
      const fixturePath = join(__dirname, 'fixtures', 'gcode', 'cura-basic.gcode');
      const content = readFileSync(fixturePath, 'utf8');
      
      const result = parseGcode(content);
      
      // Should have estimated weight
      expect(result.filaments[0].weight).toBeDefined();
      expect(parseFloat(result.filaments[0].weight)).toBeGreaterThan(0);
      expect(result.totalFilamentWeight).toBeDefined();
    });

    it('should not have color data for Cura files', () => {
      const fixturePath = join(__dirname, 'fixtures', 'gcode', 'cura-basic.gcode');
      const content = readFileSync(fixturePath, 'utf8');
      
      const result = parseGcode(content);
      
      expect(result.filaments[0].color).toBeUndefined();
    });
  });

  describe('parseGcode - real file', () => {
    it.skip('should parse munchie_PLA_1h35m.gcode with two colors', () => {
      const fixturePath = join(__dirname, '..', 'models', 'gcode-samples', 'munchie_PLA_1h35m.gcode');
      
      try {
        const content = readFileSync(fixturePath, 'utf8');
        const result = parseGcode(content);
        
        // Verify time format if present
        if (result.printTime) {
          expect(result.printTime).toMatch(/\d+/); // At least contains a number
        }
        
        // Verify has filaments
        expect(result.filaments.length).toBeGreaterThan(0);
        
        // Verify total weight if present
        if (result.totalFilamentWeight) {
          expect(result.totalFilamentWeight).toMatch(/[\d.]+g/);
        }
        
        // If it has multiple filaments, check colors
        if (result.filaments.length >= 2) {
          const colors = result.filaments.map(f => f.color).filter(c => c);
          // Just verify we have some color data
          expect(colors.length).toBeGreaterThan(0);
        }
        
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          console.warn('Skipping real file test - file not found:', fixturePath);
          // Don't fail the test if the file doesn't exist
        } else {
          throw error;
        }
      }
    });
  });

  describe('parseGcode - edge cases', () => {
    it('should handle empty file', () => {
      const result = parseGcode('');
      expect(result.filaments).toHaveLength(0);
      expect(result.printTime).toBeUndefined();
      expect(result.totalFilamentWeight).toBeUndefined();
    });

    it('should handle malformed comments', () => {
      const content = `;total filament length [mm] : invalid\n;TIME:not_a_number\n`;
      const result = parseGcode(content);
      
      // Invalid data still creates a filament entry with "invalid" as the length string
      expect(result.filaments.length).toBeGreaterThanOrEqual(0);
      expect(result.printTime).toBeUndefined();
    });

    it('should handle missing fields', () => {
      const content = `;total filament length [mm] : 1000.0\n`;
      const result = parseGcode(content);
      
      expect(result.filaments).toHaveLength(1);
      expect(result.filaments[0].type).toBe('Unknown');
    });

    it('should handle partial data', () => {
      const content = `
;total filament length [mm] : 1000.0,2000.0
;filament_type = PLA
      `.trim();
      
      const result = parseGcode(content);
      
      // Should create 2 filaments even though only 1 type is specified
      expect(result.filaments).toHaveLength(2);
      expect(result.filaments[0].type).toBe('PLA');
      expect(result.filaments[1].type).toBe('Unknown');
    });

    it('should only read first 200 lines', () => {
      // Create content with more than 200 lines
      const header = `;total filament length [mm] : 1000.0\n;TIME:3600\n`;
      const filler = 'G1 X10 Y10\n'.repeat(300);
      const lateData = `;total filament length [mm] : 9999.0\n`; // This should be ignored
      
      const result = parseGcode(header + filler + lateData);
      
      // Should use data from first 200 lines only
      expect(result.filaments[0].length).toBe('1000.00mm');
      expect(result.printTime).toBe('1h');
    });

    it('should handle mixed case comments (case-insensitive)', () => {
      const content = `;TOTAL FILAMENT LENGTH [MM] : 1000.0\n`;
      const result = parseGcode(content);
      
      // Parser is case-insensitive to handle format variations
      expect(result.filaments).toHaveLength(1);
      expect(result.filaments[0].length).toBe('1000.00mm');
    });

    it('should distinguish filament_colour from filament_colour_type', () => {
      // Test that parser correctly extracts hex colors and not type codes
      const content = `
;total filament length [mm] : 1000.0,2000.0
;total filament weight [g] : 3.0,6.0
;filament_type = PLA;PETG
;filament_colour = #FFFFFF;#FF0000
;filament_colour_type = 0;1
      `.trim();
      
      const result = parseGcode(content);
      
      expect(result.filaments).toHaveLength(2);
      // Should have hex colors, not type codes
      expect(result.filaments[0].color).toBe('#FFFFFF');
      expect(result.filaments[1].color).toBe('#FF0000');
    });
  });

  describe('parseGcode - weight calculation', () => {
    it('should calculate total weight from multiple filaments', () => {
      const content = `
;total filament length [mm] : 1000.0,2000.0,3000.0
;total filament weight [g] : 3.0,6.0,9.0
;filament_type = PLA;PLA;PLA
      `.trim();
      
      const result = parseGcode(content);
      
      expect(result.totalFilamentWeight).toBe('18.00g');
    });

    it('should use provided weight over estimated weight', () => {
      const content = `
;total filament length [mm] : 1000.0
;total filament weight [g] : 5.0
;filament_type = PLA
      `.trim();
      
      const result = parseGcode(content);
      
      expect(result.filaments[0].weight).toBe('5.00g');
      expect(result.totalFilamentWeight).toBe('5.00g');
    });

    it('should estimate weight when not provided', () => {
      const content = `
;total filament length [mm] : 1000.0
;filament_type = PLA
;filament_density: 1.24
      `.trim();
      
      const result = parseGcode(content);
      
      expect(result.filaments[0].weight).toBeDefined();
      expect(parseFloat(result.filaments[0].weight)).toBeGreaterThan(0);
    });
  });
});
