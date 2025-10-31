import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Trash2, Loader2, Link as LinkIcon, FileText, ExternalLink, Calendar, Sparkles } from 'lucide-react';
import { parseDocument } from '../lib/documentParser';
import { vectorSearchService } from '../lib/vectorSearch';
import Navbar from '../components/Navbar';
import { motion } from 'framer-motion';

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
      const { error } = await supabase
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-[calc(100vh-120px)] pt-32">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading your documents...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <div className="pt-32 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-0">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              AI-Powered Document Analysis
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Your Document
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Library</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Upload documents, add links, and let AI analyze and understand your content
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Upload Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
            {/* File Upload */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Upload Document
              </h2>
              <div {...getRootProps()}>
                <input {...getInputProps()} />
                <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-gray-50 hover:shadow-md'}`}>
                  {isUploading ? (
                    <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
                  ) : (
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  )}
                  <p className="mt-4 text-gray-700 font-medium">
                    {isUploading ? "Uploading..." :
                      isDragActive ? "Drop the file here..." :
                      "Drag & drop or click to select"}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    PPTX, DOCX, TXT, MD
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Tip: Convert documents to Word if format not supported
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Add Link */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-purple-600" />
                Add Link
              </h2>
              <form onSubmit={addLink} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Link Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 px-4 py-3"
                    placeholder="Enter a title..."
                    required
                  />
                </div>
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                    URL
                  </label>
                  <input
                    type="url"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 px-4 py-3"
                    placeholder="https://example.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-xl shadow-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all"
                >
                  <LinkIcon className="mr-2 h-5 w-5" />
                  Add Link
                </button>
              </form>
            </motion.div>
          </div>

          {uploadError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl"
            >
              {uploadError}
            </motion.div>
          )}

          {/* Documents List */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Your Documents</h3>
              <p className="text-sm text-gray-600 mt-1">{documents.length} document{documents.length !== 1 ? 's' : ''} in your library</p>
            </div>
            
            {documents.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <FileText className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <p className="text-gray-600 font-medium">No documents yet</p>
                <p className="text-sm text-gray-500 mt-2">Upload your first document or add a link to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {documents.map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="px-6 py-4 hover:bg-gray-50 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          doc.type === 'link' ? 'bg-purple-100' : 'bg-blue-100'
                        }`}>
                          {doc.type === 'link' ? (
                            <LinkIcon className="h-6 w-6 text-purple-600" />
                          ) : (
                            <FileText className="h-6 w-6 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {doc.type === 'link' ? (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-gray-900 hover:text-blue-600 truncate block group-hover:underline"
                            >
                              {doc.title}
                              <ExternalLink className="inline-block ml-1 w-4 h-4" />
                            </a>
                          ) : (
                            <p className="font-medium text-gray-900 truncate">
                              {doc.title}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            {new Date(doc.created_at).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteDocument(doc.id)}
                        className="ml-4 text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}