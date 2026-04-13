import pypdf
import os

def extract_text_from_pdf(pdf_path, output_path):
    try:
        reader = pypdf.PdfReader(pdf_path)
        text = ""
        for page_num in range(len(reader.pages)):
            page = reader.pages[page_num]
            text += page.extract_text() + "\n\n"
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Successfully extracted text to {output_path}")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    pdf_file = "pfe ekher.pdf"
    output_file = "extracted_ekher.txt"
    extract_text_from_pdf(pdf_file, output_file)
