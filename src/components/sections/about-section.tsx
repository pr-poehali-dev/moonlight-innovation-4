import { MagneticButton } from "@/components/magnetic-button"
import { useReveal } from "@/hooks/use-reveal"

export function AboutSection({ scrollToSection }: { scrollToSection?: (index: number) => void }) {
  const { ref, isVisible } = useReveal(0.3)

  return (
    <section
      ref={ref}
      id="about"
      className="relative flex min-h-screen w-full items-start px-4 py-32 md:px-12 lg:px-16"
    >
      <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: "url('https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/files/1df6a706-58a7-4e75-b7d6-f4921309aaf3.jpg')" }}>
        <div className="absolute inset-0 bg-white/90" />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-7xl flex flex-col">
        <div
          className={`mb-4 transition-all duration-700 ${
            isVisible ? "translate-y-0 opacity-100" : "-translate-y-12 opacity-0"
          }`}
        >
          <h2 className="font-sans text-2xl font-light leading-[1.1] tracking-tight text-foreground md:text-3xl lg:text-4xl">
            О группе компаний <span className="text-[#141414]">АМГ</span>
          </h2>
        </div>

        <div className="space-y-4">
          <div
            className={`grid gap-8 md:grid-cols-2 md:gap-12 transition-all duration-700 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
                Группа компаний АМГ объединяет Абаканский Завод Обработки Металлов и МайнингСтройСервис. Мы – команда профессионалов, готовая предложить вам передовые решения в области металлообработки и горно-строительных услуг.
              </p>
              <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
                Абаканский Завод Обработки Металлов – это современное производство, обеспечивающее высокое качество металлоконструкций и комплектующих для различных отраслей. Наш опыт и передовое оборудование позволяют нам реализовывать самые сложные проекты.
              </p>
              <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
                МайнингСтройСервис – ваш надежный партнер в горнодобывающей и строительной сферах. Мы осуществляем полный спектр работ: от проектирования до технического обслуживания, гарантируя эффективность и безопасность.
              </p>
              <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
                Объединив возможности наших предприятий, группа компаний АМГ предлагает комплексные решения, покрывающие весь цикл производства и реализации проектов. Мы стремимся к инновациям и высокому качеству, чтобы стать вашим идеальным партнером.
              </p>
            </div>

            <div className="flex flex-col justify-start space-y-6 md:space-y-8">
              {[
                { value: "300+", label: "Объектов", sublabel: "Сдано в Хакасии и крае", direction: "right" },
                { value: "15", label: "Лет", sublabel: "На рынке металлообработки", direction: "left" },
                { value: "5000т", label: "Металла", sublabel: "Ежегодно в производстве", direction: "right" },
              ].map((stat, i) => {
                const getRevealClass = () => {
                  if (!isVisible) {
                    return stat.direction === "left" ? "-translate-x-16 opacity-0" : "translate-x-16 opacity-0"
                  }
                  return "translate-x-0 opacity-100"
                }

                return (
                  <div
                    key={i}
                    className={`flex items-baseline gap-4 border-l border-foreground/30 pl-4 transition-all duration-700 md:gap-8 md:pl-8 ${getRevealClass()}`}
                    style={{
                      transitionDelay: `${300 + i * 150}ms`,
                      marginLeft: i % 2 === 0 ? "0" : "auto",
                      maxWidth: i % 2 === 0 ? "100%" : "85%",
                    }}
                  >
                    <div className="text-3xl font-light text-foreground md:text-5xl lg:text-6xl">{stat.value}</div>
                    <div>
                      <div className="font-sans text-base font-light text-foreground md:text-xl">{stat.label}</div>
                      <div className="font-mono text-xs text-foreground/60">{stat.sublabel}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div
            className={`flex flex-wrap gap-3 transition-all duration-700 md:gap-4 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
            }`}
            style={{ transitionDelay: "750ms" }}
          >
            <MagneticButton size="lg" variant="primary" onClick={() => scrollToSection?.(4)}>
              Запросить расчёт
            </MagneticButton>
            <MagneticButton size="lg" variant="secondary" onClick={() => scrollToSection?.(1)}>
              Наши объекты
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  )
}