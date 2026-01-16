import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { MessageSquare, FileText, Mic, Database } from 'lucide-react'
import { ReactNode } from 'react'

export function FeaturesSection() {
    return (
        <section className="bg-zinc-50 dark:bg-zinc-900 py-16 md:py-32">
            <div className="@container mx-auto max-w-5xl px-6">
                <div className="text-center">
                    <h2 className="text-balance text-4xl font-semibold lg:text-5xl text-gray-900 dark:text-white">
                        Everything You Need to Excel
                    </h2>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">
                        Powerful AI features designed specifically for modern students.
                    </p>
                </div>
                <div className="mx-auto mt-8 grid max-w-sm grid-cols-1 md:max-w-none md:grid-cols-2 lg:grid-cols-4 gap-6 *:text-center md:mt-16">
                    <Card className="group shadow-black-950/5 dark:bg-zinc-800 dark:border-zinc-700 hover:shadow-xl transition-all duration-300 border-2 border-blue-500/50">
                        <CardHeader className="pb-3">
                            <CardDecorator>
                                <Database className="size-6 text-blue-600 dark:text-blue-400" aria-hidden />
                            </CardDecorator>

                            <h3 className="mt-6 font-medium dark:text-white">🔥 Generate JSONL Datasets</h3>
                        </CardHeader>

                        <CardContent>
                            <p className="text-sm text-gray-600 dark:text-gray-400"><strong>NEW!</strong> Generate training datasets from PDF, DOCX, PPTX documents instantly. Perfect for AI fine-tuning!</p>
                        </CardContent>
                    </Card>

                    <Card className="group shadow-black-950/5 dark:bg-zinc-800 dark:border-zinc-700 hover:shadow-xl transition-all duration-300">
                        <CardHeader className="pb-3">
                            <CardDecorator>
                                <MessageSquare className="size-6 text-blue-600 dark:text-blue-400" aria-hidden />
                            </CardDecorator>

                            <h3 className="mt-6 font-medium dark:text-white">AI Chat Assistant</h3>
                        </CardHeader>

                        <CardContent>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Get instant answers and explanations with our intelligent AI tutor powered by advanced language models.</p>
                        </CardContent>
                    </Card>

                    <Card className="group shadow-black-950/5 dark:bg-zinc-800 dark:border-zinc-700 hover:shadow-xl transition-all duration-300">
                        <CardHeader className="pb-3">
                            <CardDecorator>
                                <FileText className="size-6 text-blue-600 dark:text-blue-400" aria-hidden />
                            </CardDecorator>

                            <h3 className="mt-6 font-medium dark:text-white">Document Analysis</h3>
                        </CardHeader>

                        <CardContent>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Upload and analyze PDFs, Word docs, and study materials with AI-powered insights and summaries.</p>
                        </CardContent>
                    </Card>

                    <Card className="group shadow-black-950/5 dark:bg-zinc-800 dark:border-zinc-700 hover:shadow-xl transition-all duration-300">
                        <CardHeader className="pb-3">
                            <CardDecorator>
                                <Mic className="size-6 text-blue-600 dark:text-blue-400" aria-hidden />
                            </CardDecorator>

                            <h3 className="mt-6 font-medium dark:text-white">Voice Conversations</h3>
                        </CardHeader>

                        <CardContent>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Have natural voice conversations with your AI tutor for a more interactive learning experience.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    )
}

const CardDecorator = ({ children }: { children: ReactNode }) => (
    <div aria-hidden className="relative mx-auto size-36 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]">
        <div className="absolute inset-0 [--border:black] dark:[--border:white] bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:24px_24px] opacity-10"/>
        <div className="bg-background dark:bg-zinc-800 absolute inset-0 m-auto flex size-12 items-center justify-center border-t border-l dark:border-zinc-600">{children}</div>
    </div>
)
