import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AiPythonRunnerService } from './ai-python-runner.service';

describe('AiPythonRunnerService', () => {
  const originalCwd = process.cwd();
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pcsystemstore-ai-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('devuelve error controlado si no existe predictor.py', async () => {
    const service = new AiPythonRunnerService();

    await expect(service.runPredictor([])).rejects.toThrow(
      'No se encontro el archivo predictor.py',
    );
  });
});
