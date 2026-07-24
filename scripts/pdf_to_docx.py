import sys
from pdf2docx import Converter

def main():
    input_path, output_path = sys.argv[1], sys.argv[2]
    cv = Converter(input_path)
    cv.convert(output_path)
    cv.close()

if __name__ == "__main__":
    main()
