import { useReveal } from "@/hooks/use-reveal"

export function ServicesSection() {
  const { ref, isVisible } = useReveal(0.3)

  return (
    <section
      ref={ref}
      id="services"
      className="relative flex min-h-screen w-full items-center px-6 py-32 md:px-12 lg:px-16"
    >
      <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: "url('https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/files/1df6a706-58a7-4e75-b7d6-f4921309aaf3.jpg')" }}>
        <div className="absolute inset-0 bg-white/90" />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div
          className={`mb-12 transition-all duration-700 md:mb-16 ${
            isVisible ? "translate-y-0 opacity-100" : "-translate-y-12 opacity-0"
          }`}
        >
          <h2 className="mb-2 font-sans text-2xl font-light leading-[1.1] tracking-tight text-foreground md:text-3xl lg:text-4xl">
            Услуги
          </h2>
          <p className="font-mono text-sm text-foreground/60 md:text-base">/ Наши компетенции</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 md:gap-x-16 md:gap-y-12 lg:gap-x-24">
          {[
            {
              title: "Металлообработка",
              description: "Токарные, фрезерные и сварочные работы. Изготовление деталей по чертежам заказчика с точностью до 0,01 мм.",
              direction: "top",
            },
            {
              title: "Металлоконструкции",
              description: "Проектирование и производство несущих конструкций, ферм, колонн, балок для промышленных и гражданских объектов.",
              direction: "right",
            },
            {
              title: "Лазерная резка и раскрой",
              description: "Высокоточная резка листового металла, профиля и труб. Работаем с черным металлом, нержавейкой и цветными сплавами.",
              direction: "left",
            },
            {
              title: "Монтаж и антикоррозийная защита",
              description: "Монтаж готовых конструкций на объекте, покраска и нанесение защитных покрытий для долгого срока службы.",
              direction: "bottom",
            },
            {
              title: "Ремонт промышленного оборудования",
              description: "Ремонт дробильного оборудования, грохотов, насосов высокого давления, гидроцилиндров, карданных валов и многого другого.",
              direction: "left",
            },
            {
              title: "Комплексные решения под ключ",
              description: "Строительство модульных зданий и сооружений, отделочные работы, водоснабжение, водоотведение и отопление. Автоматизация и изготовление производственных и конвейерных линий. Поставка и запуск оборудования для металлодобычи и извлечения для золотодобывающих компаний. Шеф-монтаж, гарантия, постгарантийное обслуживание. Срочные аварийные ремонты 24/7.",
              direction: "bottom",
            },
          ].map((service, i) => (
            <ServiceCard key={i} service={service} index={i} isVisible={isVisible} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ServiceCard({
  service,
  index,
  isVisible,
}: {
  service: { title: string; description: string; direction: string }
  index: number
  isVisible: boolean
}) {
  const getRevealClass = () => {
    if (!isVisible) {
      switch (service.direction) {
        case "left":
          return "-translate-x-16 opacity-0"
        case "right":
          return "translate-x-16 opacity-0"
        case "top":
          return "-translate-y-16 opacity-0"
        case "bottom":
          return "translate-y-16 opacity-0"
        default:
          return "translate-y-12 opacity-0"
      }
    }
    return "translate-x-0 translate-y-0 opacity-100"
  }

  return (
    <div
      className={`group transition-all duration-700 ${getRevealClass()}`}
      style={{
        transitionDelay: `${index * 150}ms`,
      }}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="h-px w-8 bg-foreground/30 transition-all duration-300 group-hover:w-12 group-hover:bg-foreground/50" />
        <span className="font-mono text-xs text-foreground/60">0{index + 1}</span>
      </div>
      <h3 className="mb-2 font-sans text-base font-light text-foreground md:text-lg lg:text-xl">{service.title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-foreground/80 md:text-base">{service.description}</p>
    </div>
  )
}