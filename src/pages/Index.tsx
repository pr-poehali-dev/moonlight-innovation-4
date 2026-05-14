import { WorkSection } from "@/components/sections/work-section"
import { ServicesSection } from "@/components/sections/services-section"
import { AboutSection } from "@/components/sections/about-section"
import { ClientsSection } from "@/components/sections/clients-section"
import { ContactSection } from "@/components/sections/contact-section"
import { MagneticButton } from "@/components/magnetic-button"
import { useEffect, useState } from "react"

const SECTIONS = ["Главная", "Работы", "Услуги", "О нас", "Контакты"]
const SECTION_IDS = ["hero", "works", "services", "about", "contacts"]

export default function Index() {
  const [currentSection, setCurrentSection] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
    fetch("https://functions.poehali.dev/9fc752ab-8d3d-4236-bc17-543820608736", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: window.location.pathname }),
    }).catch(() => {})
  }, [])

  const scrollToSection = (index: number) => {
    const el = document.getElementById(SECTION_IDS[index])
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
      setCurrentSection(index)
    }
  }

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    SECTION_IDS.forEach((id, index) => {
      const el = document.getElementById(id)
      if (!el) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setCurrentSection(index)
        },
        { threshold: 0.4 }
      )
      observer.observe(el)
      observers.push(observer)
    })
    return () => observers.forEach((o) => o.disconnect())
  }, [])

  return (
    <main className="relative w-full bg-background">
      <nav
        className={`fixed left-0 right-0 top-0 z-50 flex items-end justify-between px-6 pb-4 pt-2 transition-opacity duration-700 md:px-12 [&>div]:mb-[1.5cm] ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          onClick={() => scrollToSection(0)}
          className="flex items-center gap-0 transition-transform hover:scale-105 md:flex-none w-full justify-center md:w-auto md:justify-start"
          style={{ marginLeft: "-1cm" }}
        >
          <img
            src="https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/7b4ccbce-5c89-46bb-a8d2-35dd09ecdd32.png"
            alt="АЗОМ"
            className="h-32 w-auto"
          />
          <img
            src="https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/77df7b95-de84-41c1-91db-cba1516b2392.png"
            alt="МайнингСтройСервис"
            className="h-32 w-auto"
            style={{ marginLeft: "-1.5cm" }}
          />
        </button>

        <div className="hidden items-center gap-8 md:flex">
          {SECTIONS.map((item, index) => (
            <button
              key={item}
              onClick={() => scrollToSection(index)}
              className={`group relative font-sans text-sm font-bold transition-all duration-300 ${
                currentSection === index
                  ? "text-orange-500 drop-shadow-[0_0_12px_rgba(230,100,0,1)] drop-shadow-[0_0_25px_rgba(230,100,0,0.8)]"
                  : "text-black/70 hover:text-orange-500 hover:drop-shadow-[0_0_12px_rgba(230,100,0,1)] hover:drop-shadow-[0_0_25px_rgba(230,100,0,0.8)]"
              }`}
            >
              {item}
              <span
                className={`absolute -bottom-1 left-0 h-px bg-black transition-all duration-300 ${
                  currentSection === index ? "w-full" : "w-0 group-hover:w-full"
                }`}
              />
            </button>
          ))}
        </div>

        <div className="hidden md:block">
          <MagneticButton variant="primary" onClick={() => scrollToSection(4)} className="mb-[1.5cm] md:px-6 md:py-2.5 md:text-sm">
            Связаться
          </MagneticButton>
        </div>
      </nav>

      <div className={`transition-opacity duration-700 ${isLoaded ? "opacity-100" : "opacity-0"}`}>
        {/* Hero Section */}
        <section id="hero" className="relative flex min-h-screen w-full flex-col justify-start px-6 pb-16 md:px-12 md:pb-24" style={{ paddingTop: "calc(8rem + 1cm)" }}>
          <div
            className="absolute inset-0 z-0 bg-cover bg-center"
            style={{ backgroundImage: "url('https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/files/1df6a706-58a7-4e75-b7d6-f4921309aaf3.jpg')" }}
          >
            <div className="absolute inset-0 bg-white/90" />
          </div>
          <div className="relative z-10 w-full">
            <div className="mb-4 inline-block animate-in fade-in slide-in-from-bottom-4 rounded-full border border-foreground/20 bg-foreground/10 px-4 py-1.5 backdrop-blur-md duration-700">
              <p className="font-mono text-xs text-foreground/90">Абакан · Металлообработка и металлоконструкции</p>
            </div>
            <h1 className="mb-6 w-full animate-in fade-in slide-in-from-bottom-8 font-sans text-2xl font-light leading-[1.1] tracking-tight text-black duration-1000 md:text-3xl lg:text-4xl text-center">
              <span className="text-balance">Металлообработка и Промышленное строительство</span>
            </h1>
            <div className="mb-8 w-full animate-in fade-in slide-in-from-bottom-4 text-lg leading-relaxed text-black/80 duration-1000 delay-200 text-justify space-y-4">
              <p>Абаканский Завод Обработки Металлов – это современное производство, обеспечивающее высокое качество металлоконструкций и комплектующих для различных отраслей. Наш опыт и передовое оборудование позволяют нам реализовывать самые сложные проекты.</p>
              <p>МайнингСтройСервис – ваш надежный партнер в горнодобывающей и строительной сферах. Мы осуществляем полный спектр работ: от проектирования до технического обслуживания, гарантируя эффективность и безопасность.</p>
              <p>Объединив возможности наших предприятий, группа компаний АМГ предлагает комплексные решения, покрывающие весь цикл производства и реализации проектов. Мы стремимся к инновациям и высокому качеству, чтобы стать вашим идеальным партнером.</p>
            </div>
            <div className="flex animate-in fade-in slide-in-from-bottom-4 flex-col gap-4 duration-1000 delay-300 sm:flex-row sm:items-center">
              <MagneticButton
                size="lg"
                variant="primary"
                onClick={() => scrollToSection(4)}
              >
                Получить расчёт
              </MagneticButton>
              <MagneticButton size="lg" variant="secondary" onClick={() => scrollToSection(2)}>
                Наши услуги
              </MagneticButton>
            </div>
          </div>
        </section>

        <WorkSection />
        <ServicesSection />
        <AboutSection scrollToSection={scrollToSection} />
        <ClientsSection />
        <ContactSection />
      </div>
    </main>
  )
}