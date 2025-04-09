export const formatSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const processObjects = (objectsList, currentPrefix) => {
  const folders = new Map();
  const files = [];
  
  objectsList.forEach(obj => {
    // Remove current prefix from name
    const name = obj.name.startsWith(currentPrefix) 
      ? obj.name.substring(currentPrefix.length) 
      : obj.name;
    
    // Skip if empty
    if (!name) return;
    
    // Check if it's a folder (has '/' in it)
    const slashIndex = name.indexOf('/');
    
    if (slashIndex > 0) {
      // It's a folder
      const folderName = name.substring(0, slashIndex + 1);
      
      if (!folders.has(folderName)) {
        folders.set(folderName, {
          name: folderName,
          prefix: currentPrefix + folderName,
          isFolder: true,
          size: 0,
          lastModified: obj.lastModified
        });
      }
    } else {
      // It's a file
      files.push({
        ...obj,
        name,
        isFolder: false
      });
    }
  });
  
  // Combine folders and files, sorted by name
  return [...Array.from(folders.values()), ...files].sort((a, b) => {
    // Folders first
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    // Then by name
    return a.name.localeCompare(b.name);
  });
};