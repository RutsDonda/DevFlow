// src/components/workspace/FileExplorer.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const FileExplorer = ({ projectId, onSelectFile }) => {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await axios.get(`/api/projects/${projectId}/files`);
        if (res.data.success) setFiles(res.data.data.files);
      } catch (err) {
        console.error('Failed to fetch files', err);
      }
    };
    fetchFiles();
  }, [projectId]);

  return (
    <div className="h-full overflow-auto bg-gray-900 border-r border-gray-800 p-2">
      <h3 className="text-gray-300 font-medium mb-2">Files</h3>
      <ul className="space-y-1 text-sm text-gray-400">
        {files.map((file) => (
          <li
            key={file._id}
            className="cursor-pointer hover:text-white"
            onClick={() => onSelectFile(file)}
          >
            {file.path}{file.name}.{file.extension}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FileExplorer;
