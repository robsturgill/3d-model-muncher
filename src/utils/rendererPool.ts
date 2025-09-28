// Re-export the implementation from the .tsx file so other modules can import
// from '../utils/rendererPool' without knowing about the .tsx extension.
export * from './rendererPool.tsx';
import RendererPoolDefault from './rendererPool.tsx';
export default RendererPoolDefault;
