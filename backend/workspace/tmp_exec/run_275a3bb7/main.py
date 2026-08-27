import pytesseract
import cv2

image = cv2.imread('diagram-export-25-08-2026-19_04_30.svg')

gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

text = pytesseract.image_to_string(gray, lang='eng', config='--psm 11 --oem 3 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')

print(text)

# Save the result to a file
with open('output.txt', 'w') as file:
    file.write(text)

# Perform OCR on the image
ocr_result = pytesseract.image_to_string(image, lang='eng', config='--psm 11 --oem 3 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')

print(ocr_result)

# Save the result to a file
with open('ocr_result.txt', 'w') as file:
    file.write(ocr_result)}