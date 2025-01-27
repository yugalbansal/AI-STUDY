import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Trash2, Loader2, Link as LinkIcon } from 'lucide-react';
import { parseDocument } from '../lib/documentParser';

export default function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !user?.id) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      const content = await parseDocument(file);
      
      const { error } = await supabase
        .from('documents')
        .insert({
          title: file.name,
          content,
          type: 'file',
          user_id: user.id
        });

      if (error) throw error;
      await fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      setUploadError(error.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  }, [user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    },
    multiple: false,
    disabled: isUploading
  });

  async function deleteDocument(id: string) {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDocuments(documents.filter(doc => doc.id !== id));
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !title.trim() || !user?.id) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      const { error } = await supabase
        .from('documents')
        .insert({
          title: title.trim(),
          content: `Link: ${url.trim()}`,
          type: 'link',
          url: url.trim(),
          user_id: user.id
        });

      if (error) throw error;
      await fetchDocuments();
      setUrl('');
      setTitle('');
    } catch (error: any) {
      console.error('Error adding link:', error);
      setUploadError(error.message || 'Failed to add link');
    } finally {
      setIsUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Documents</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {isUploading ? (
              <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
            ) : (
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
            )}
            <p className="mt-2 text-gray-600">
              {isUploading ? "Uploading..." :
                isDragActive ? "Drop the file here..." :
                "Drag 'n' drop a file here, or click to select"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Supported formats: PDF, DOCX, TXT, MD
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-8 border-2 border-gray-200">
          <form onSubmit={addLink} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Link Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter a title for the link"
                required
              />
            </div>
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                URL
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="https://example.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isUploading}
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <LinkIcon className="mr-2 h-4 w-4" />
              Add Link
            </button>
          </form>
        </div>
      </div>

      {uploadError && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
          {uploadError}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {documents.map((doc) => (
            <li key={doc.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      {doc.type === 'link' ? (
                        <LinkIcon className="h-5 w-5 text-gray-400 mr-2" />
                      ) : (
                        <Upload className="h-5 w-5 text-gray-400 mr-2" />
                      )}
                      {doc.type === 'link' ? (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate"
                        >
                          {doc.title}
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-blue-600 truncate">
                          {doc.title}
                        </p>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Uploaded on {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
          {documents.length === 0 && (
            <li>
              <div className="px-4 py-4 sm:px-6 text-center text-gray-500">
                No documents uploaded yet
              </div>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}