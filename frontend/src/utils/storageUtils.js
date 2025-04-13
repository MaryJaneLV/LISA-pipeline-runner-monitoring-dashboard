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
    const name = obj.name.startsWith(currentPrefix) 
      ? obj.name.substring(currentPrefix.length) 
      : obj.name;
    
    if (!name) return;
    
    const slashIndex = name.indexOf('/');
    
    if (slashIndex > 0) {
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
      files.push({
        ...obj,
        name,
        isFolder: false
      });
    }
  });
  
  return [...Array.from(folders.values()), ...files].sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.name.localeCompare(b.name);
  });
};