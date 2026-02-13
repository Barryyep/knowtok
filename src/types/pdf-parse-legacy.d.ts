declare module "pdf-parse/lib/pdf-parse.js" {
  type ParseResult = {
    text?: string;
  };

  export default function pdfParse(
    dataBuffer: Buffer,
    options?: Record<string, unknown>,
  ): Promise<ParseResult>;
}
