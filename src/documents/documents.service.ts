import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PrepareDocumentDto } from './dto/prepare-document.dto';
import { SubmitSigningDto } from './dto/submit-signing.dto';
import { embedFieldsInPdf } from 'src/utils/pdf-editor';

@Injectable()
export class DocumentsService {
    constructor(private prisma: PrismaService) { }

    async uploadDocument(file: { originalname: string; buffer: Buffer }, userId: number, dto: CreateDocumentDto) {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

        const filePath = path.join(uploadsDir, file.originalname);
        fs.writeFileSync(filePath, file.buffer);

        return this.prisma.document.create({
            data: {
                title: dto.title,
                filePath: file.originalname,
                userId,
            },
        });
    }

    async getDocumentMetadata(id: string) {
        return this.prisma.document.findUnique({
            where: { id },
            include: {
                signer: true,
                fields: true,
            },
        });
    }

    async downloadDocumentFile(id: string) {
        console.log('id', id);
        const doc = await this.prisma.document.findUnique({
            where: { id },
        });

        if (!doc) {
            throw new Error('Document not found');
        }


        const filePath = path.join(process.cwd(), 'uploads', doc.filePath);
        const fileExists = fs.existsSync(filePath);

        if (!fileExists) {
            throw new Error('File does not exist');
        }

        return fs.readFileSync(filePath);
    }

    async getDocuments() {
        return this.prisma.document.findMany();
    }

    // async prepareDocument(id: string, dto: PrepareDocumentDto) {
    //     const doc = await this.prisma.document.findUnique({ where: { id } });

    //     if (!doc) {
    //         throw new Error('Document not found');
    //     }

    //     // Create or find signer
    //     let signer = await this.prisma.signer.findFirst({
    //         where: { email: dto.signer.email },
    //     });

    //     if (!signer) {
    //         signer = await this.prisma.signer.create({
    //             data: {
    //                 name: dto.signer.name,
    //                 email: dto.signer.email,
    //             },
    //         });
    //     }

    //     // Update document with signer ID
    //     await this.prisma.document.update({
    //         where: { id },
    //         data: {
    //             signerId: signer.id,
    //             status: 'DRAFT',
    //         },
    //     });

    //     // Create fields
    //     const fieldCreateMany = dto.fields.map((field) => ({
    //         type: field.type,
    //         x: field.x,
    //         y: field.y,
    //         page: field.page,
    //         documentId: id,
    //     }));

    //     await this.prisma.field.createMany({
    //         data: fieldCreateMany,
    //     });

    //     return { message: 'Document prepared successfully' };
    // }

    async prepareDocument(id: string, dto: PrepareDocumentDto) {
        const doc = await this.prisma.document.findUnique({ where: { id } });

        if (!doc) {
            throw new Error('Document not found');
        }

        // Create or find signer
        let signer = await this.prisma.signer.findFirst({
            where: { email: dto.signer.email },
        });

        if (!signer) {
            signer = await this.prisma.signer.create({
                data: {
                    name: dto.signer.name,
                    email: dto.signer.email,
                },
            });
        }

        // Update document with signer ID
        await this.prisma.document.update({
            where: { id },
            data: {
                signerId: signer.id,
                status: 'DRAFT',
            },
        });

        // Clear existing fields if any (to avoid duplication)
        await this.prisma.field.deleteMany({
            where: { documentId: id },
        });

        // Create new fields
        const fieldCreateMany = dto.fields.map((field) => ({
            type: field.type,
            x: field.x,
            y: field.y,
            page: field.page,
            documentId: id,
        }));

        await this.prisma.field.createMany({
            data: fieldCreateMany,
        });

        // Fetch the document with its associated fields and signer
        const updatedDoc = await this.prisma.document.findUnique({
            where: { id },
            include: {
                fields: true, // Ensure fields are populated
                signer: true, // Ensure signer is populated
            },
        });

        return updatedDoc;
    }


    async sendDocument(id: string) {
        const doc = await this.prisma.document.findUnique({
            where: { id },
            include: { signer: true },
        });

        if (!doc) throw new Error('Document not found');
        if (!doc.signerId) throw new Error('Document does not have a signer');

        // If signer doesn't already have a token, generate one
        if (!doc.signer?.signerToken) {
            const signerToken = uuidv4();

            await this.prisma.signer.update({
                where: { id: doc.signerId },
                data: { signerToken },
            });

            console.log(`Signer link: http://localhost:3000/sign/${signerToken}`);
        }

        await this.prisma.document.update({
            where: { id },
            data: {
                status: 'SENT',
            },
        });

        return { message: 'Document sent for signing' };
    }

    async getDocumentForSigning(signerToken: string) {
        const signer = await this.prisma.signer.findUnique({
            where: { signerToken },
            include: {
                documents: {
                    include: {
                        fields: true,
                    },
                },
            },
        });

        if (!signer || signer.documents.length === 0) {
            throw new Error('Invalid token or no document found');
        }

        // Assume each signer has only one document (as per your schema logic)
        const document = signer.documents[0];

        return {
            documentId: document.id,
            title: document.title,
            fields: document.fields,
        };
    }


    async submitSignedData(signerToken: string, dto: SubmitSigningDto) {
        const signer = await this.prisma.signer.findUnique({
            where: { signerToken },
            include: { documents: true },
        });

        if (!signer || signer.documents.length === 0) {
            throw new Error('Invalid token');
        }

        const document = signer.documents[0];

        for (const field of dto.fields) {
            const fieldId = (field as any).id ?? (field as any).fieldId;

            if (!fieldId) {
                throw new Error(`Missing field identifier in: ${JSON.stringify(field)}`);
            }

            await this.prisma.field.update({
                where: { id: fieldId },
                data: { value: field.value },
            });
        }

        await this.prisma.document.update({
            where: { id: document.id },
            data: { status: 'SIGNED' },
        });

        return { message: 'Document signed successfully' };
    }

    async getFinalDocument(id: string) {
        console.log('id', id);
        const document = await this.prisma.document.findUnique({
            where: { id },
            include: {
                fields: true,
                signer: true,
                user: true,
            },
        });

        if (!document) throw new Error('Document not found');

        return {
            id: document.id,
            title: document.title,
            uploadedAt: document.uploadedAt,
            status: document.status,
            filePath: document.filePath,
            uploadedBy: {
                id: document.user.id,
                email: document.user.email,
            },
            signer: {
                name: document.signer?.name,
                email: document.signer?.email,
            },
            fields: document.fields.map((field) => ({
                id: field.id,
                type: field.type,
                x: field.x,
                y: field.y,
                page: field.page,
                value: field.value || null,
            })),
        };
    }

    async getSignedDocument(id: string) {
        const document = await this.prisma.document.findUnique({
            where: { id },
            include: {
                fields: true,
                signer: true,
                user: true,
            },
        });

        if (!document) throw new Error('Document not found');

        if (!document.filePath) {
            throw new Error('Document file path is missing');
        }

        const originalPath = path.join(__dirname, '..', '..', 'uploads', path.basename(document.filePath));

        if (!fs.existsSync(originalPath)) {
            throw new Error(`Original file not found at: ${originalPath}`);
        }

        const signedOutputPath = path.join(__dirname, '..', '..', 'uploads', `signed-${document.id}.pdf`);

        console.log('signedOutputPath', signedOutputPath);

        const transformedFields = document.fields.map(field => {
            console.log('field', field);
            return {
                type: field.type,
                value: field.value || '',
                x: field.x,
                y: field.y,
                page: field.page,
            }
        })

        await embedFieldsInPdf(originalPath, signedOutputPath, transformedFields);

        return {
            ...document,
            signedFilePath: `uploads/signed-${document.id}.pdf`,
        };
    }


}

