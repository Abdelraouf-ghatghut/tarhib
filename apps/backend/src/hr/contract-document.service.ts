import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const REFERENCE_PATTERN =
  /^contract-document:([0-9a-f-]{36})\/([0-9a-f-]{36})\.(pdf|jpg|png)\.gz$/;

export interface ContractUpload {
  buffer: Buffer;
  size: number;
}

export interface ContractDocument {
  buffer: Buffer;
  extension: 'pdf' | 'jpg' | 'png';
  contentType: string;
}

@Injectable()
export class ContractDocumentService {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = config.get<string>(
      'CONTRACT_DOCUMENTS_DIR',
      join(process.cwd(), '.data', 'contracts'),
    );
  }

  async store(contractId: string, file: ContractUpload): Promise<string> {
    if (!file?.buffer?.length || file.size <= 0) {
      throw new BadRequestException('contractDocumentRequired');
    }
    const extension = this.detectExtension(file.buffer);
    const relative = `${contractId}/${randomUUID()}.${extension}.gz`;
    const target = join(this.root, relative);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await gzipAsync(file.buffer, { level: 9 }), {
      mode: 0o600,
    });
    return `contract-document:${relative}`;
  }

  async read(reference: string): Promise<ContractDocument> {
    const parsed = this.parseReference(reference);
    const compressed = await readFile(join(this.root, parsed.relative));
    return {
      buffer: await gunzipAsync(compressed),
      extension: parsed.extension,
      contentType:
        parsed.extension === 'pdf'
          ? 'application/pdf'
          : parsed.extension === 'png'
            ? 'image/png'
            : 'image/jpeg',
    };
  }

  async remove(reference: string | null | undefined): Promise<void> {
    if (!reference) return;
    const parsed = this.parseReference(reference);
    await unlink(join(this.root, parsed.relative)).catch((err: unknown) => {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    });
  }

  private parseReference(reference: string): {
    relative: string;
    extension: 'pdf' | 'jpg' | 'png';
  } {
    const match = REFERENCE_PATTERN.exec(reference);
    if (!match) throw new BadRequestException('invalidContractDocument');
    return {
      relative: `${match[1]}/${match[2]}.${match[3]}.gz`,
      extension: match[3] as 'pdf' | 'jpg' | 'png',
    };
  }

  private detectExtension(buffer: Buffer): 'pdf' | 'jpg' | 'png' {
    if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'pdf';
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
      return 'jpg';
    if (
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    )
      return 'png';
    throw new BadRequestException('invalidContractDocumentType');
  }
}
