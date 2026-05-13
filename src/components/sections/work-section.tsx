import { useState, useEffect } from "react"
import { useReveal } from "@/hooks/use-reveal"
import { Dialog, DialogContent } from "@/components/ui/dialog"

const API_URL = "https://functions.poehali.dev/2bd7a9a0-3822-4e18-bdd8-38b4a107a4ab"

type Stage = "Все" | "В производстве" | "Готово" | "Смонтировано"

const STAGES: Stage[] = ["Все", "В производстве", "Готово", "Смонтировано"]

interface Project {
  id: number
  title: string
  description: string
  stage: Exclude<Stage, "Все">
  images: string[]
}

const STAGE_COLORS: Record<Exclude<Stage, "Все">, string> = {
  "В производстве": "bg-blue-100 text-blue-700",
  "Готово": "bg-green-100 text-green-700",
  "Смонтировано": "bg-orange-100 text-orange-700",
}

export function WorkSection() {
  const { ref, isVisible } = useReveal(0.2)
  const [activeStage, setActiveStage] = useState<Stage>("Все")
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null)
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    fetch(API_URL)
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const filtered = activeStage === "Все"
    ? projects
    : projects.filter((p) => p.stage === activeStage)

  const openLightbox = (images: string[], index: number) => setLightbox({ images, index })
  const closeLightbox = () => setLightbox(null)
  const prevImage = () => lightbox && setLightbox({ ...lightbox, index: (lightbox.index - 1 + lightbox.images.length) % lightbox.images.length })
  const nextImage = () => lightbox && setLightbox({ ...lightbox, index: (lightbox.index + 1) % lightbox.images.length })

  return (
    <section
      ref={ref}
      id="works"
      className="relative w-full px-6 py-24 md:px-12 lg:px-16"
    >
      <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: "url('https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/files/1df6a706-58a7-4e75-b7d6-f4921309aaf3.jpg')" }}>
        <div className="absolute inset-0 bg-white/90" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className={`mb-10 transition-all duration-700 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
          <h2 className="mb-2 font-sans text-2xl font-light leading-[1.1] tracking-tight text-foreground md:text-3xl lg:text-4xl">
            Объекты
          </h2>
          <p className="font-mono text-sm text-foreground/60 md:text-base">/ Галерея выполненных работ</p>
        </div>

        <div className={`mb-8 flex flex-wrap gap-2 transition-all duration-700 delay-100 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
          {STAGES.map((stage) => (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              className={`rounded-full border px-4 py-1.5 font-mono text-xs transition-all duration-200 ${
                activeStage === stage
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-foreground/20 bg-white/60 text-foreground/60 hover:border-orange-400 hover:text-orange-500"
              }`}
            >
              {stage}
            </button>
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project, i) => (
            <div
              key={project.id}
              className={`group overflow-hidden rounded-2xl border border-foreground/10 bg-white/70 backdrop-blur-sm transition-all duration-700 hover:shadow-xl hover:-translate-y-1`}
              style={{ transitionDelay: `${i * 80}ms`, opacity: isVisible ? 1 : 0, transform: isVisible ? "translateY(0)" : "translateY(24px)" }}
            >
              <div
                className="relative h-56 cursor-pointer overflow-hidden"
                onClick={() => openLightbox(project.images, 0)}
              >
                <img
                  src={project.images[0]}
                  alt={project.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {project.images.length > 1 && (
                  <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 font-mono text-xs text-white">
                    +{project.images.length - 1} фото
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/20">
                  <span className="scale-0 rounded-full bg-white/90 px-4 py-2 font-mono text-xs text-foreground transition-all duration-300 group-hover:scale-100">
                    Открыть
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-sans text-base font-medium text-foreground">{project.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] ${STAGE_COLORS[project.stage]}`}>
                    {project.stage}
                  </span>
                </div>
                <p className="font-mono text-xs text-foreground/50 leading-relaxed">{project.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!lightbox} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-4xl border-0 bg-black/95 p-0">
          {lightbox && (
            <div className="relative flex items-center justify-center">
              <img
                src={lightbox.images[lightbox.index]}
                alt=""
                className="max-h-[85vh] w-full object-contain"
              />
              {lightbox.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/25"
                  >
                    ‹
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/25"
                  >
                    ›
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-xs text-white/60">
                    {lightbox.index + 1} / {lightbox.images.length}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}