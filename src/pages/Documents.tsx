import { useCallback, useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useDropzone } from 'react-dropzone';
import { useClerkAuth } from '../contexts/ClerkAuthContext';
import { Upload, Trash2, Loader2, Link as LinkIcon, FileText, ExternalLink, Calendar, Sparkles } from 'lucide-react';
import { parseDocument } from '../lib/documentParser';
import { vectorSearchService } from '../lib/vectorSearch';
import Navbar from '../components/Navbar';
import { motion } from 'framer-motion';

export default function Documents() {
  const { user, userId, supabase, loading: authLoading } = useClerkAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!authLoading && userId && supabase) {
      fetchDocuments();
    }
  }, [userId, authLoading, supabase]);



  async function fetchDocuments() {
    if (!supabase) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      
      setDocuments(data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !userId || !supabase) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      const content = await parseDocument(file);
      
      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: file.name,
          content,
          type: 'file',
          user_id: userId
        })
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      // Generate and store embeddings for the document asynchronously
      if (data) {
        vectorSearchService.storeDocumentEmbeddings(
          data.id,
          userId,
          content,
          data.title
        ).catch(() => {});
      }
      
      await fetchDocuments();
    } catch (error: any) {
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
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
      
      // Clean up embeddings for the deleted document
      vectorSearchService.deleteDocumentEmbeddings(id)
        .catch(() => {});
      
      setDocuments(documents.filter(doc => doc.id !== id));
    } catch (error) {
    }
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !title.trim() || !userId || !supabase) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      const linkContent = `Link: ${url.trim()}`;
      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: title.trim(),
          content: linkContent,
          type: 'link',
          url: url.trim(),
          user_id: userId
        })
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      // Generate and store embeddings for the link asynchronously
      if (data) {
        vectorSearchService.storeDocumentEmbeddings(
          data.id,
          userId,
          linkContent,
          data.title
        ).catch(() => {});
      }
      
      await fetchDocuments();
      setUrl('');
      setTitle('');
    } catch (error: any) {
      setUploadError(error.message || 'Failed to add link');
    } finally {
      setIsUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
        <Navbar />
        <div className="flex justify-center items-center h-[calc(100vh-120px)] pt-32">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading your documents...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>My Documents - Vector Mind AI</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      <Navbar />
      
      {/* Hero Section */}
      <div className="pt-32 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-blue-50/50 dark:from-zinc-900 dark:via-zinc-900 dark:to-purple-950/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-0">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              AI-Powered Document Analysis
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Your Document
              <span className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-purple-500 bg-clip-text text-transparent"> Library</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
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
              className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Upload Document
              </h2>
              <div {...getRootProps()}>
                <input {...getInputProps()} />
                <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragActive ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/50 scale-[1.02]' : 'border-gray-300 dark:border-zinc-600'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-zinc-700/50 hover:shadow-md'}`}>
                  {isUploading ? (
                    <Loader2 className="mx-auto h-12 w-12 text-blue-600 dark:text-blue-400 animate-spin" />
                  ) : (
                    <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                  )}
                  <p className="mt-4 text-gray-700 dark:text-gray-300 font-medium">
                    {isUploading ? "Uploading..." :
                      isDragActive ? "Drop the file here..." :
                      "Drag & drop or click to select"}
                  </p>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    PPTX, DOCX, TXT, MD
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
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
              className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Add Link
              </h2>
              <form onSubmit={addLink} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Link Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="block w-full rounded-xl border-gray-300 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white shadow-sm focus:border-purple-500 dark:focus:border-purple-400 focus:ring-purple-500 dark:focus:ring-purple-400 px-4 py-3"
                    placeholder="Enter a title..."
                    required
                  />
                </div>
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    URL
                  </label>
                  <input
                    type="url"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="block w-full rounded-xl border-gray-300 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white shadow-sm focus:border-purple-500 dark:focus:border-purple-400 focus:ring-purple-500 dark:focus:ring-purple-400 px-4 py-3"
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
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl"
            >
              {uploadError}
            </motion.div>
          )}

          {/* Documents List */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-700 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Documents</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{documents.length} document{documents.length !== 1 ? 's' : ''} in your library</p>
            </div>
            
            {documents.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <FileText className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">No documents yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Upload your first document or add a link to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-zinc-700">
                {documents.map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          doc.type === 'link' ? 'bg-purple-100 dark:bg-purple-900/50' : 'bg-blue-100 dark:bg-blue-900/50'
                        }`}>
                          {doc.type === 'link' ? (
                            <LinkIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {doc.type === 'link' ? (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block group-hover:underline"
                            >
                              {doc.title}
                              <ExternalLink className="inline-block ml-1 w-4 h-4" />
                            </a>
                          ) : (
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {doc.title}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
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
                        className="ml-4 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
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
    </>
  );
}