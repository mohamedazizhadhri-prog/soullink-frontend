import pypdf

reader = pypdf.PdfReader("Cahier_des_Charges_SoulLink_Structure (1).pdf")
text = ""
for page in reader.pages:
    text += page.extract_text() + "\n\n"

with open("cdc_extracted.txt", "w", encoding="utf-8") as f:
    f.write(text)
print(f"Done. {len(reader.pages)} pages extracted.")
