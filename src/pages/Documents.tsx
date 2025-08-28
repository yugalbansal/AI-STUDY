import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Trash2, Loader2, Link as LinkIcon } from 'lucide-react';
import { parseDocument } from '../lib/documentParser';
import { vectorSearchService } from '../lib/vectorSearch';

export default function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (user?.id) {
      // Ensure user exists in users table before fetching documents
      ensureUserExists().then(() => {
        fetchDocuments();
      });
    }
  }, [user]);

  async function ensureUserExists() {
    if (!user?.id) return;
    
    try {
      // Check if user exists in users table
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();
        
      if (error && error.code === 'PGRST116') {
        // User doesn't exist, create them
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            role: user.email === 'studyai.platform@gmail.com' ? 'admin' : 'user',
            last_seen: new Date().toISOString()
          });
          
        if (insertError) {
          console.error('Error creating user record:', insertError);
        }
      }
    } catch (error) {
      console.error('Error ensuring user exists:', error);
    }
  }

  async function fetchDocuments() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        throw error;
      }
      
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
      // Ensure user exists in users table before uploading
      await ensureUserExists();
      
      const content = await parseDocument(file);
      
      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: file.name,
          content,
          type: 'file',
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting document:', error);
        throw error;
      }
      
      // Generate and store embeddings for the document asynchronously
      if (data) {
        vectorSearchService.storeDocumentEmbeddings(
          data.id,
          user.id,
          content
        ).catch(error => console.error('Error storing document embeddings:', error));
      }
      
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
    // 'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
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

      if (error) {
        console.error('Error deleting document:', error);
        throw error;
      }
      
      // Clean up embeddings for the deleted document
      vectorSearchService.deleteDocumentEmbeddings(id)
        .catch(error => console.error('Error deleting document embeddings:', error));
      
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
      // Ensure user exists in users table before adding link
      await ensureUserExists();
      
      const linkContent = `Link: ${url.trim()}`;
      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: title.trim(),
          content: linkContent,
          type: 'link',
          url: url.trim(),
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding link:', error);
        throw error;
      }
      
      // Generate and store embeddings for the link asynchronously
      if (data) {
        vectorSearchService.storeDocumentEmbeddings(
          data.id,
          user.id,
          linkContent
        ).catch(error => console.error('Error storing link embeddings:', error));
      }
      
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Documents</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <div className={`border-2 border-dashed rounded-lg p-4 sm:p-6 lg:p-8 text-center cursor-pointer transition-all ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-gray-50'} touch-manipulation`}>
            {isUploading ? (
              <Loader2 className="mx-auto h-8 sm:h-10 lg:h-12 w-8 sm:w-10 lg:w-12 text-blue-600 animate-spin" />
            ) : (
              <Upload className="mx-auto h-8 sm:h-10 lg:h-12 w-8 sm:w-10 lg:w-12 text-gray-400" />
            )}
            <p className="mt-2 text-gray-600 text-sm sm:text-base">
              {isUploading ? "Uploading..." :
                isDragActive ? "Drop the file here..." :
                "Drag 'n' drop a file here, or click to select"}
            </p>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              Supported formats: PPTX, DOCX, TXT, MD
            </p>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              Important Tip: Convert your documents to Word file if desired format not supported.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 sm:p-6 lg:p-8 border-2 border-gray-200 shadow-sm">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Add Link</h2>
          <form onSubmit={addLink} className="space-y-3 sm:space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Link Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base p-2.5 sm:p-3 touch-manipulation"
                placeholder="Enter a title for the link"
                required
              />
            </div>
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                URL
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base p-2.5 sm:p-3 touch-manipulation"
                placeholder="https://example.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isUploading}
              className="w-full flex justify-center items-center px-4 py-2.5 sm:py-3 border border-transparent rounded-md shadow-sm text-sm sm:text-base font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all touch-manipulation min-h-[44px]"
            >
              <LinkIcon className="mr-2 h-4 w-4 flex-shrink-0" />
              Add Link
            </button>
          </form>
        </div>
      </div>

      {uploadError && (
        <div className="mb-4 p-3 sm:p-4 bg-red-50 text-red-700 rounded-md text-sm">
          {uploadError}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden rounded-md">
        <div className="px-4 py-3 sm:px-6 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">Your Documents ({documents.length})</h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {documents.map((doc) => (
            <li key={doc.id}>
              <div className="px-3 sm:px-4 py-3 sm:py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      {doc.type === 'link' ? (
                        <LinkIcon className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400 mr-2 sm:mr-3 flex-shrink-0" />
                      ) : (
                        <Upload className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400 mr-2 sm:mr-3 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        {doc.type === 'link' ? (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm sm:text-base font-medium text-blue-600 hover:text-blue-800 truncate block touch-manipulation"
                          >
                            {doc.title}
                          </a>
                        ) : (
                          <p className="text-sm sm:text-base font-medium text-blue-600 truncate">
                            {doc.title}
                          </p>
                        )}
                        <p className="mt-1 text-xs sm:text-sm text-gray-500">
                          Uploaded on {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="ml-3 sm:ml-4 flex-shrink-0">
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="text-red-600 hover:text-red-900 hover:bg-red-50 p-2 rounded-md touch-manipulation transition-all"
                      title="Delete document"
                    >
                      <Trash2 className="h-4 sm:h-5 w-4 sm:w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
          {documents.length === 0 && (
            <li>
              <div className="px-4 py-8 sm:px-6 text-center text-gray-500">
                <Upload className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm sm:text-base">No documents uploaded yet</p>
                <p className="text-xs sm:text-sm mt-1">Upload your first document to get started</p>
              </div>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}