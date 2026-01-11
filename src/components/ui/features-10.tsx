import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Image, LucideIcon, Mic2, Layers } from 'lucide-react'
import { ReactNode } from 'react'

export function Features10() {
    return (
        <section className="bg-zinc-50 py-16 md:py-32 dark:bg-transparent">
            <div className="mx-auto max-w-2xl px-6 lg:max-w-5xl">
                <div className="mx-auto grid gap-4 lg:grid-cols-2">
                    <FeatureCard>
                        <CardHeader className="pb-3">
                            <CardHeading
                                icon={Mic2}
                                title="Voice Conversations"
                                description="Have natural voice conversations with AI for hands-free learning experience."
                            />
                        </CardHeader>

                        <div className="relative mb-6 border-t border-dashed sm:mb-0">
                            <div className="absolute inset-0 [background:radial-gradient(125%_125%_at_50%_0%,transparent_40%,hsl(var(--muted)),white_125%)] dark:[background:radial-gradient(125%_125%_at_50%_0%,transparent_40%,hsl(var(--muted)),hsl(var(--background))_125%)]"></div>
                            <div className="aspect-[76/59] p-1 px-6 flex items-center justify-center">
                                <div className="w-full max-w-md">
                                    <VoiceVisualization />
                                </div>
                            </div>
                        </div>
                    </FeatureCard>

                    <FeatureCard>
                        <CardHeader className="pb-3">
                            <CardHeading
                                icon={Image}
                                title="AI Image Generation"
                                description="Create educational images and visual aids instantly with AI-powered generation."
                            />
                        </CardHeader>

                        <CardContent>
                            <div className="relative mb-6 sm:mb-0">
                                <div className="absolute -inset-6 [background:radial-gradient(50%_50%_at_75%_50%,transparent,hsl(var(--background))_100%)]"></div>
                                <div className="aspect-[76/59] border rounded-lg overflow-hidden dark:border-zinc-700">
                                    <ImageGenPreview />
                                </div>
                            </div>
                        </CardContent>
                    </FeatureCard>

                    <FeatureCard className="p-6 lg:col-span-2">
                        <p className="mx-auto my-6 max-w-md text-balance text-center text-2xl font-semibold dark:text-white">Multi-modal learning with text, voice, documents, and images in one platform.</p>

                        <div className="flex justify-center gap-6 overflow-hidden">
                            <CircularUI
                                label="Chat"
                                circles={[{ pattern: 'border' }, { pattern: 'primary' }]}
                            />

                            <CircularUI
                                label="Voice"
                                circles={[{ pattern: 'primary' }, { pattern: 'blue' }]}
                            />

                            <CircularUI
                                label="Documents"
                                circles={[{ pattern: 'blue' }, { pattern: 'border' }]}
                            />

                            <CircularUI
                                label="Images"
                                circles={[{ pattern: 'border' }, { pattern: 'none' }]}
                                className="hidden sm:block"
                            />
                        </div>
                    </FeatureCard>
                </div>
            </div>
        </section>
    )
}

// Voice Visualization Component
const VoiceVisualization = () => (
    <div className="space-y-6 p-4">
        <div className="flex justify-center items-end gap-1 h-32">
            {[20, 45, 65, 85, 70, 90, 75, 60, 80, 55, 70, 85, 65, 50, 70, 85, 60, 75, 55, 40].map((height, i) => (
                <div
                    key={i}
                    className="w-2 rounded-full bg-gradient-to-t from-blue-500 to-blue-400 dark:from-blue-600 dark:to-blue-400 transition-all duration-300"
                    style={{ height: `${height}%` }}
                ></div>
            ))}
        </div>
        <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center animate-pulse">
                <Mic2 className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-1">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Listening...</div>
                <div className="text-xs text-muted-foreground dark:text-gray-400">Tap to speak with AI</div>
            </div>
        </div>
    </div>
)

// Image Generation Preview Component
const ImageGenPreview = () => (
    <div className="h-full bg-gradient-to-br from-white to-gray-50 dark:from-zinc-800 dark:to-zinc-900 p-6 space-y-4">
        <div className="aspect-video rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border border-gray-200 dark:border-zinc-700 flex items-center justify-center">
            <div className="text-center space-y-2">
                <Layers className="w-12 h-12 mx-auto text-blue-600 dark:text-blue-400" />
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Generated Image</div>
            </div>
        </div>
        <div className="space-y-2">
            <div className="h-3 w-full rounded bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-to-r from-blue-500 to-purple-500 rounded animate-pulse"></div>
            </div>
            <div className="text-xs text-center text-muted-foreground dark:text-gray-400">
                Generating visual content...
            </div>
        </div>
    </div>
)

interface FeatureCardProps {
    children: ReactNode
    className?: string
}

const FeatureCard = ({ children, className }: FeatureCardProps) => (
    <Card className={cn('group relative rounded-none shadow-zinc-950/5 dark:bg-zinc-900/50 dark:border-zinc-700', className)}>
        <CardDecorator />
        {children}
    </Card>
)

const CardDecorator = () => (
    <>
        <span className="border-primary absolute -left-px -top-px block size-2 border-l-2 border-t-2"></span>
        <span className="border-primary absolute -right-px -top-px block size-2 border-r-2 border-t-2"></span>
        <span className="border-primary absolute -bottom-px -left-px block size-2 border-b-2 border-l-2"></span>
        <span className="border-primary absolute -bottom-px -right-px block size-2 border-b-2 border-r-2"></span>
    </>
)

interface CardHeadingProps {
    icon: LucideIcon
    title: string
    description: string
}

const CardHeading = ({ icon: Icon, title, description }: CardHeadingProps) => (
    <div className="p-6">
        <span className="text-muted-foreground dark:text-gray-400 flex items-center gap-2">
            <Icon className="size-4" />
            {title}
        </span>
        <p className="mt-8 text-2xl font-semibold dark:text-white">{description}</p>
    </div>
)

interface CircleConfig {
    pattern: 'none' | 'border' | 'primary' | 'blue'
}

interface CircularUIProps {
    label: string
    circles: CircleConfig[]
    className?: string
}

const CircularUI = ({ label, circles, className }: CircularUIProps) => (
    <div className={className}>
        <div className="bg-gradient-to-b from-border dark:from-zinc-700 size-fit rounded-2xl to-transparent p-px">
            <div className="bg-gradient-to-b from-background to-muted/25 dark:from-zinc-800 dark:to-zinc-900/25 relative flex aspect-square w-fit items-center -space-x-4 rounded-[15px] p-4">
                {circles.map((circle, i) => (
                    <div
                        key={i}
                        className={cn('size-7 rounded-full border sm:size-8', {
                            'border-primary dark:border-blue-500 border-gray-300': circle.pattern === 'none',
                            'border-primary dark:border-blue-500 border-gray-400 bg-[repeating-linear-gradient(-45deg,theme(colors.gray.300),theme(colors.gray.300)_1px,transparent_1px,transparent_4px)] dark:bg-[repeating-linear-gradient(-45deg,theme(colors.zinc.700),theme(colors.zinc.700)_1px,transparent_1px,transparent_4px)]': circle.pattern === 'border',
                            'border-primary dark:border-blue-500 border-blue-600 bg-white dark:bg-zinc-800 bg-[repeating-linear-gradient(-45deg,theme(colors.blue.500),theme(colors.blue.500)_1px,transparent_1px,transparent_4px)]': circle.pattern === 'primary',
                            'bg-white dark:bg-zinc-800 z-1 border-blue-500 bg-[repeating-linear-gradient(-45deg,theme(colors.blue.500),theme(colors.blue.500)_1px,transparent_1px,transparent_4px)]': circle.pattern === 'blue',
                        })}></div>
                ))}
            </div>
        </div>
        <span className="text-muted-foreground dark:text-gray-400 mt-1.5 block text-center text-sm">{label}</span>
    </div>
)
