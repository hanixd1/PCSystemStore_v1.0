import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

type PythonCandidate = { command: string; args: string[] };

@Injectable()
export class AiPythonRunnerService {
  private readonly logger = new Logger(AiPythonRunnerService.name);
  private readonly predictorScriptPath = resolve(process.cwd(), 'predictor.py');

  private getPythonCandidates(): PythonCandidate[] {
    const configuredPython = process.env.PYTHON_BIN?.trim();
    const candidates = configuredPython
      ? [{ command: configuredPython, args: [] as string[] }]
      : [];

    if (process.platform === 'win32') {
      candidates.push({ command: 'python', args: [] });
      candidates.push({ command: 'py', args: ['-3'] });
    } else {
      candidates.push({ command: 'python3', args: [] });
      candidates.push({ command: 'python', args: [] });
    }

    const seen = new Set<string>();
    return candidates.filter((candidate) => {
      const key = `${candidate.command} ${candidate.args.join(' ')}`.trim();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private execute(command: string, args: string[], products: unknown[]): Promise<any[]> {
    return new Promise((resolvePromise, reject) => {
      const child = spawn(command, [...args, this.predictorScriptPath], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (chunk) => {
        output += String(chunk);
      });

      child.stderr.on('data', (chunk) => {
        errorOutput += String(chunk);
      });

      child.on('error', reject);
      child.on('close', (code) => {
        if (code !== 0) {
          reject(
            new Error(errorOutput || output || `El proceso de Python termino con codigo ${code}.`),
          );
          return;
        }

        if (!output) {
          reject(new Error('El predictor de Python no devolvio una respuesta JSON.'));
          return;
        }

        try {
          const parsed = JSON.parse(output);
          if (parsed.error) {
            reject(new Error(parsed.detalle || parsed.error));
            return;
          }

          resolvePromise(Array.isArray(parsed.data) ? parsed.data : []);
        } catch {
          reject(new Error(`La salida de Python no es JSON valido: ${output}`));
        }
      });

      child.stdin.write(JSON.stringify({ productos: products }));
      child.stdin.end();
    });
  }

  async runPredictor(products: unknown[]): Promise<any[]> {
    if (!existsSync(this.predictorScriptPath)) {
      throw new Error(`No se encontro el archivo predictor.py en ${this.predictorScriptPath}`);
    }

    let lastError: unknown;
    for (const candidate of this.getPythonCandidates()) {
      try {
        return await this.execute(candidate.command, candidate.args, products);
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`No se pudo ejecutar predictor con ${candidate.command}: ${message}`);
      }
    }

    throw (
      lastError ??
      new Error('No se encontro un ejecutable de Python. Configura PYTHON_BIN en el backend.')
    );
  }
}
