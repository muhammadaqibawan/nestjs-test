import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

export async function embedFieldsInPdf(
    originalPath: string,
    outputPath: string,
    fields: {
        type: string;
        value: string;
        x: number;
        y: number;
        page: number;
    }[],
) {
    const existingPdfBytes = await readFile(originalPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const field of fields) {
        const page = pages[field.page - 1];
        if (!page) continue;

        const value = field.value || '';
        const x = field.x;
        const y = field.y;

        if (field.type === 'SIGNATURE') {
            // Render base64 image of signature
            const signatureImageBytes = Buffer.from(value.split(',')[1], 'base64');
            const pngImage = await pdfDoc.embedPng(signatureImageBytes);
            page.drawImage(pngImage, {
                x,
                y,
                width: 150,
                height: 50,
            });
        } else {
            // Textual fields
            page.drawText(value, {
                x,
                y,
                size: 12,
                font,
                color: rgb(0, 0, 0),
            });
        }
    }

    const pdfBytes = await pdfDoc.save();
    await writeFile(outputPath, pdfBytes);
}
