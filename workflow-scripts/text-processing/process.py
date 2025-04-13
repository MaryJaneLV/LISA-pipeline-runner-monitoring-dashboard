import os
import sys

# Get the input text from environment variable
input_text = os.environ.get("INPUT_TEXT", "Hello, world!")
operation = os.environ.get("OPERATION", "uppercase")

print(f"Processing text: {input_text}")
print(f"Operation: {operation}")

# Process the text
result = ""
if operation == "uppercase":
    result = input_text.upper()
elif operation == "lowercase":
    result = input_text.lower()
elif operation == "reverse":
    result = input_text[::-1]
elif operation == "wordcount":
    result = str(len(input_text.split()))
else:
    result = input_text

print(f"Result: {result}")

# Save the result to output file
output_dir = "/tmp/output"
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "result.txt")

with open(output_path, "w") as f:
    f.write(result)

print(f"Result saved to {output_path}")