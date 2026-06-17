import os
import shutil

def organize_files(source_dir):
    images_dir = os.path.join(source_dir, "Images")
    docs_dir = os.path.join(source_dir, "Documents")
    videos_dir = os.path.join(source_dir, "Videos")

    # Ensure targeted folders exist
    for folder in [images_dir, docs_dir, videos_dir]:
        if not os.path.exists(folder):
            os.makedirs(folder)

    moved_files = []

    # Iterate over files in the directory
    for filename in os.listdir(source_dir):
        file_path = os.path.join(source_dir, filename)
        
        # Skip directories
        if not os.path.isfile(file_path):
            continue
            
        # Skip project files and the script itself
        if filename in ["organize.py", "app.py", "requirements.txt", "README.md", ".gitignore"]:
            continue

        ext = os.path.splitext(filename)[1].lower()
        target = None

        if ext in ['.jpg', '.jpeg', '.gif']:
            target = images_dir
        elif ext == '.txt':
            target = docs_dir
        elif ext == '.mp4':
            target = videos_dir

        if target:
            dest_path = os.path.join(target, filename)
            shutil.move(file_path, dest_path)
            moved_files.append(f"{filename} -> {os.path.basename(target)}")

    if moved_files:
        print("Successfully organized the following files:")
        for log in moved_files:
            print(f"  - {log}")
    else:
        print("No new files matching (.jpg, .jpeg, .gif, .txt, .mp4) were found to organize.")

if __name__ == "__main__":
    current_directory = os.path.dirname(os.path.abspath(__file__))
    organize_files(current_directory)
