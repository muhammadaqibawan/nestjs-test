import {
    Controller,
    Post,
    Get,
    Param,
    UploadedFile,
    UseInterceptors,
    Body,
    Req,
    Res,
    UseGuards,
    NotFoundException,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateDocumentDto } from './dto/create-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request, Response } from 'express';
import { PrepareDocumentDto } from './dto/prepare-document.dto';
import { SubmitSigningDto } from './dto/submit-signing.dto';
import * as path from 'path';
import * as fs from 'fs';

@Controller('documents')
export class DocumentsController {
    constructor(private documentsService: DocumentsService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    @UseInterceptors(FileInterceptor('file'))
    async upload(
        @UploadedFile() file: any,
        @Body() dto: CreateDocumentDto,
        @Req() req: Request
    ) {
        const user = req.user as any;
        return this.documentsService.uploadDocument(file, user.userId, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    async getMetadata(@Param('id') id: string) {
        return this.documentsService.getDocumentMetadata(id);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id/download')
    async download(@Param('id') id: string, @Res() res: Response) {
        try {
            const file = await this.documentsService.downloadDocumentFile(id);

            res.setHeader('Content-Type', 'application/pdf');
            res.send(file);
        } catch (error) {
            return res.status(404).send({ message: error.message });
        }
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/prepare')
    async prepareDocument(
        @Param('id') id: string,
        @Body() dto: PrepareDocumentDto,
    ) {
        return this.documentsService.prepareDocument(id, dto);
    }


    @UseGuards(JwtAuthGuard)
    @Get()
    async getDocuments(): Promise<any[]> {
        return this.documentsService.getDocuments();
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/send')
    async sendDocument(@Param('id') id: string) {
        return this.documentsService.sendDocument(id);
    }

    @Get('/sign/:signerToken')
    async getSignPage(@Param('signerToken') signerToken: string) {
        return this.documentsService.getDocumentForSigning(signerToken);
    }

    @Post('/sign/:signerToken')
    async submitSignData(
        @Param('signerToken') signerToken: string,
        @Body() dto: SubmitSigningDto,
    ) {
        return this.documentsService.submitSignedData(signerToken, dto);
    }

    @Get('/documents/:id/final')
    async getFinalDocument(@Param('id') id: string) {
        return this.documentsService.getFinalDocument(id);
    }

    @Get('/documents/:id/signed-pdf')
    async getSignedPdf(@Param('id') id: string, @Res() res: Response) {
        try {
            const document = await this.documentsService.getSignedDocument(id);
            const filePath = path.join(process.cwd(), document.signedFilePath);

            if (!fs.existsSync(filePath)) {
                throw new Error('Signed document not found');
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.sendFile(filePath);
        } catch (error) {
            return res.status(404).send({ message: error.message });
        }
    }

}
