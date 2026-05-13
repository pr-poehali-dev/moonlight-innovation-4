import { useReveal } from "@/hooks/use-reveal"

const CLIENTS = [
  {
    name: "Норникель",
    logo: "https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/248f0f03-5c91-40cb-a731-a9f157bfb3bf.png",
  },
  {
    name: "РУСАЛ",
    logo: "https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/b3624d85-6bb2-4e2d-ab46-d001d27fc63f.png",
  },
  {
    name: "Русская Платина",
    logo: "https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/c4048ae8-f791-4e26-bab1-2226eaae3926.png",
  },
  {
    name: "АЛРОСА",
    logo: "https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/f0f720ed-7a69-4293-b3b6-2df6bd9f3c43.jpeg",
  },
  {
    name: "СУЭК",
    logo: "https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/a0910042-9c55-4170-9787-d2059bcdbcfd.png",
  },
]

export function ClientsSection() {
  const { ref, isVisible } = useReveal(0.2)

  return (
    <section
      ref={ref}
      id="clients"
      className="relative w-full px-6 py-20 md:px-12 lg:px-16"
    >
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/files/1df6a706-58a7-4e75-b7d6-f4921309aaf3.jpg')" }}
      >
        <div className="absolute inset-0 bg-white/90" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className={`mb-12 transition-all duration-700 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
          <h2 className="mb-2 font-sans text-2xl font-light leading-[1.1] tracking-tight text-foreground md:text-3xl lg:text-4xl">
            Клиенты
          </h2>
          <p className="font-mono text-sm text-foreground/60 md:text-base">/ Нам доверяют крупнейшие компании</p>
        </div>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {CLIENTS.map((client, i) => (
            <div
              key={client.name}
              className="flex items-center justify-center rounded-2xl border border-foreground/10 bg-white/70 p-6 backdrop-blur-sm transition-all duration-500 hover:shadow-md hover:-translate-y-0.5"
              style={{
                transitionDelay: `${i * 80}ms`,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(20px)",
              }}
            >
              <img
                src={client.logo}
                alt={client.name}
                className="h-12 w-full object-contain grayscale transition-all duration-300 hover:grayscale-0"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
