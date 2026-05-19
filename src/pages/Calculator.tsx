import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"

type Mode = "turning" | "milling"

const RATES = { turning: 1850, milling: 2100 }
const DEFAULT_SETUP_MIN = 45

const complexityMap = {
  turning: [
    { value: 1.0, text: "Простой вал / втулка (гладкая обточка)" },
    { value: 1.45, text: "Ступени, уступы, фаски, проточки" },
    { value: 2.0, text: "Стакан / глухое отверстие, канавки" },
    { value: 2.6, text: "Эксцентрик / сложная форма / резьба" },
  ],
  milling: [
    { value: 1.0, text: "Плоская плита / пластина (черновая)" },
    { value: 1.5, text: "Паз, уступ, простые карманы" },
    { value: 2.2, text: "Сложный корпус, 2.5D обработка" },
    { value: 3.0, text: "3D-контур / пресс-форма / сложная поверхность" },
  ],
}

function getBaseTimeTurning(diam: number, len: number) {
  const d = Math.max(10, diam)
  const l = Math.max(10, len)
  const machineTime = (l * Math.pow(d, 0.42)) / 235
  const setupPart = 8 + (d > 130 ? 4 : 0)
  return Math.round((machineTime + setupPart) * 10) / 10
}

function getBaseTimeMilling(lenMm: number, widthMm: number) {
  const L = Math.max(15, lenMm)
  const W = Math.max(15, widthMm)
  const areaFactor = (L * W) / 4800
  const perimeterFactor = (2 * (L + W)) / 320
  const machineTime = areaFactor * 5.2 + perimeterFactor * 3.0
  return Math.round(Math.min(280, Math.max(10, machineTime + 12)) * 10) / 10
}

function getMaterialFactor(mat: string) {
  if (mat === "custom") return 1.0
  if (mat === "85") return 0.85
  if (mat === "110") return 0.85
  if (mat === "65") return 1.0
  if (mat === "95") return 1.45
  if (mat === "210") return 1.9
  if (mat === "950") return 2.7
  return 1.0
}

export default function Calculator() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>("turning")
  const [material, setMaterial] = useState("65")
  const [customPrice, setCustomPrice] = useState(65)
  const [partWeight, setPartWeight] = useState(1.2)
  const [complexity, setComplexity] = useState(1.0)
  const [precision, setPrecision] = useState(1.0)
  const [sizeA, setSizeA] = useState(80)
  const [sizeB, setSizeB] = useState(200)
  const [tooling, setTooling] = useState(0)
  const [quantity, setQuantity] = useState(5)

  const complexityOptions = complexityMap[mode]

  useEffect(() => {
    setComplexity(complexityMap[mode][0].value)
    if (mode === "turning") {
      setSizeA(80)
      setSizeB(200)
      setQuantity(5)
      setPartWeight(1.2)
    } else {
      setSizeA(140)
      setSizeB(110)
      setQuantity(4)
      setPartWeight(1.6)
    }
    setTooling(0)
  }, [mode])

  const materialPriceKg =
    material === "custom" ? customPrice : parseFloat(material)

  const materialCostPerPiece = materialPriceKg * partWeight

  const baseMin =
    mode === "turning"
      ? getBaseTimeTurning(sizeA, sizeB)
      : getBaseTimeMilling(sizeA, sizeB)

  const materialFactor = getMaterialFactor(material)
  const techMult = Math.min(
    4.8,
    Math.max(0.7, materialFactor * 0.55 + complexity * 0.35 + precision * 0.4)
  )
  const adjustedMin = Math.round(baseMin * techMult * 10) / 10

  const hourly = mode === "turning" ? RATES.turning : RATES.milling
  const totalMachiningMin = adjustedMin * quantity + DEFAULT_SETUP_MIN
  const totalMachiningCost = (totalMachiningMin / 60) * hourly
  const totalMaterialCost = materialCostPerPiece * quantity
  const totalBatch = Math.round(totalMachiningCost + totalMaterialCost + tooling)
  const pricePerPiece = Math.round(totalBatch / quantity)
  const machiningPerPiece = Math.round(totalMachiningCost / quantity)

  const fmt = (n: number) => n.toLocaleString("ru-RU")

  return (
    <div style={{ background: "#0a0c10", minHeight: "100vh", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", padding: "40px 24px", color: "#e8edf2" }}>
      <div style={{ maxWidth: 1480, margin: "0 auto" }}>

        {/* Кнопка назад */}
        <button
          onClick={() => navigate("/")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(224,58,26,0.15)", border: "1px solid rgba(224,58,26,0.3)",
            color: "#ff5e3a", borderRadius: 40, padding: "8px 18px",
            fontSize: "0.8rem", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
            cursor: "pointer", marginBottom: 24, transition: "0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(224,58,26,0.28)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(224,58,26,0.15)")}
        >
          ← Назад на сайт
        </button>

        <div style={{ display: "inline-block", fontSize: "0.75rem", letterSpacing: 2, textTransform: "uppercase", background: "rgba(220,60,30,0.2)", color: "#ff5e3a", padding: "6px 14px", borderRadius: 40, marginBottom: 20, fontWeight: 600, marginLeft: 16 }}>
          ⚙️ AMG industrial tech
        </div>

        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 700, background: "linear-gradient(135deg, #fff 20%, #b0bec5 80%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", letterSpacing: -1, marginBottom: 12 }}>
          Калькулятор<br />токарных и фрезерных работ
        </h1>
        <div style={{ color: "#8a99aa", fontSize: "1rem", borderLeft: "3px solid #e03a1a", paddingLeft: 18, marginBottom: 40 }}>
          Расчёт серийности · материал с реальной ценой · подготовка КП за 2 минуты
        </div>

        {/* Карточка */}
        <div style={{ background: "#0f1219", borderRadius: 36, border: "1px solid rgba(255,85,45,0.25)", boxShadow: "0 25px 40px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)", overflow: "hidden" }}>

          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", padding: "32px 36px 36px" }}>

            {/* Левая колонка — параметры */}
            <div style={{ flex: "1.6", minWidth: 280 }}>

              {/* Переключатель режима */}
              <div style={{ display: "flex", background: "#080b10", padding: 8, borderRadius: 70, marginBottom: 30, gap: 8, border: "1px solid #232732" }}>
                {(["turning", "milling"] as Mode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      flex: 1, textAlign: "center", padding: "12px 8px", fontWeight: 700,
                      borderRadius: 60, cursor: "pointer", transition: "0.2s", border: "none",
                      background: mode === m ? "linear-gradient(95deg,#e03a1a,#c72c0c)" : "transparent",
                      color: mode === m ? "white" : "#8a99aa",
                      fontSize: "1rem", letterSpacing: 0.5,
                      boxShadow: mode === m ? "0 6px 14px rgba(224,58,26,0.3)" : "none",
                    }}
                  >
                    {m === "turning" ? "🔩 Токарная обработка" : "🛠️ Фрезерная обработка"}
                  </button>
                ))}
              </div>

              {/* Материал */}
              <Param label="🧱 Материал заготовки">
                <StyledSelect value={material} onChange={e => setMaterial(e.target.value)}>
                  <option value="custom">🔘 Своя цена / металл (ввести ниже)</option>
                  <option value="85">Алюминий / Д16Т — 85 ₽/кг</option>
                  <option value="110">Латунь / бронза — 110 ₽/кг</option>
                  <option value="65">Конструкционная сталь (Ст3, 20) — 65 ₽/кг</option>
                  <option value="95">Легированная сталь 40Х — 95 ₽/кг</option>
                  <option value="210">Нержавеющая сталь (12Х18Н10Т) — 210 ₽/кг</option>
                  <option value="950">Титановые сплавы — 950 ₽/кг</option>
                </StyledSelect>
              </Param>

              {/* Блок кастомной цены */}
              <div style={{ background: "#0a0d14", padding: "12px 16px", borderRadius: 26, marginTop: -6, marginBottom: 24, opacity: material === "custom" ? 1 : 0.6 }}>
                <div style={{ display: "flex", gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <StyledInput type="number" value={material === "custom" ? customPrice : parseFloat(material)} disabled={material !== "custom"} onChange={e => setCustomPrice(parseFloat(e.target.value) || 0)} placeholder="Цена руб/кг" step={10} />
                    <div style={{ fontSize: "0.65rem", color: "#6c7a8a", marginTop: 6, marginLeft: 12 }}>руб/кг</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <StyledInput type="number" value={partWeight} disabled={material !== "custom"} onChange={e => setPartWeight(parseFloat(e.target.value) || 0)} placeholder="Масса детали" step={0.1} />
                    <div style={{ fontSize: "0.65rem", color: "#6c7a8a", marginTop: 6, marginLeft: 12 }}>масса 1 шт (кг)</div>
                  </div>
                </div>
              </div>

              {/* Сложность */}
              <Param label="⚙️ Сложность детали">
                <StyledSelect value={complexity} onChange={e => setComplexity(parseFloat(e.target.value))}>
                  {complexityOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.text}</option>
                  ))}
                </StyledSelect>
              </Param>

              {/* Точность */}
              <Param label="🎯 Требуемая точность">
                <StyledSelect value={precision} onChange={e => setPrecision(parseFloat(e.target.value))}>
                  <option value={1.0}>IT14–IT12 (обычная) +0%</option>
                  <option value={1.45}>IT11–IT9 (средняя) +45% времени</option>
                  <option value={2.0}>IT8–IT7 (высокая H9/H7) +100% времени</option>
                </StyledSelect>
              </Param>

              {/* Габариты */}
              <Param label="📏 Габариты обработки">
                <div style={{ display: "flex", gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <StyledInput type="number" value={sizeA} onChange={e => setSizeA(parseFloat(e.target.value) || 10)} step={5} />
                    <div style={{ fontSize: "0.65rem", color: "#6c7a8a", marginTop: 6, marginLeft: 12 }}>{mode === "turning" ? "⌀ макс. диаметр (мм)" : "длина детали (мм)"}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <StyledInput type="number" value={sizeB} onChange={e => setSizeB(parseFloat(e.target.value) || 10)} step={10} />
                    <div style={{ fontSize: "0.65rem", color: "#6c7a8a", marginTop: 6, marginLeft: 12 }}>{mode === "turning" ? "длина обработки (мм)" : "ширина / высота (мм)"}</div>
                  </div>
                </div>
              </Param>

              {/* Оснастка */}
              <Param label="🛠️ Оснастка / доп. операции">
                <StyledSelect value={tooling} onChange={e => setTooling(parseInt(e.target.value))}>
                  <option value={0}>Базовая оснастка</option>
                  <option value={1800}>➕ Люнет / планшайба (+1800 ₽)</option>
                  <option value={3200}>➕ Специальные кулачки (+3200 ₽)</option>
                  <option value={500}>➕ Доп. сверление / резьба (+500 ₽)</option>
                  <option value={2800}>➕ 4-осевая обработка (+2800 ₽)</option>
                </StyledSelect>
              </Param>

              {/* Количество */}
              <Param label="📦 Серийность (количество деталей)">
                <StyledInput type="number" value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} min={1} step={1} />
                <div style={{ fontSize: "0.65rem", color: "#6c7a8a", marginTop: 6, marginLeft: 12 }}>Наладка распределяется на всю партию → цена за шт снижается</div>
              </Param>
            </div>

            {/* Правая колонка — результаты */}
            <div style={{ flex: 1, minWidth: 280, background: "#0b0e15", borderRadius: 28, padding: 24, border: "1px solid #1f232c", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02), 0 8px 20px rgba(0,0,0,0.6)" }}>

              <PriceCard label="Стоимость за 1 шт" value={`${fmt(pricePerPiece)} ₽`} sub="включая материал + обработку" accent="#e03a1a" />
              <PriceCard label="Стоимость партии" value={`${fmt(totalBatch)} ₽`} sub={`партия ${quantity} шт`} accent="#4c6a8a" />

              <DetailRow label="⏱️ Базовое время (1 шт)" value={`${baseMin.toFixed(1)} мин`} />
              <DetailRow label="⚡ Итоговое время с коэф." value={`${adjustedMin.toFixed(1)} мин`} />
              <DetailRow label="🏭 Ставка цеха (руб/ч)" value={`${fmt(hourly)} ₽/ч`} />
              <DetailRow label="🔄 Наладка на партию" value={`${DEFAULT_SETUP_MIN} мин`} />
              <DetailRow label="📦 Материал (1 шт)" value={`${fmt(Math.round(materialCostPerPiece))} ₽`} />
              <DetailRow label="🔧 Оснастка (партия)" value={`${fmt(tooling)} ₽`} />
              <DetailRow label="🛠️ Обработка (1 шт)" value={`${fmt(machiningPerPiece)} ₽`} />

              <div style={{ fontSize: "0.7rem", textAlign: "center", marginTop: 24, color: "#5e6f82", borderTop: "1px solid #1b1f28", paddingTop: 20 }}>
                *Расчёт носит оценочный характер. Точное КП после консультации с технологом.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Param({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: "block", fontWeight: 600, color: "#ccddee", marginBottom: 10, fontSize: "0.85rem", letterSpacing: 0.3 }}>{label}</label>
      {children}
    </div>
  )
}

function StyledSelect({ value, onChange, children }: { value: string | number; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{ width: "100%", background: "#03050a", border: "1.5px solid #292e3a", padding: "14px 18px", borderRadius: 24, color: "#f0f3f8", fontSize: "0.9rem", outline: "none", cursor: "pointer" }}
      onFocus={e => { e.currentTarget.style.borderColor = "#e03a1a"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(224,58,26,0.3)" }}
      onBlur={e => { e.currentTarget.style.borderColor = "#292e3a"; e.currentTarget.style.boxShadow = "none" }}
    >
      {children}
    </select>
  )
}

function StyledInput({ type, value, onChange, disabled, placeholder, step, min }: {
  type: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean; placeholder?: string; step?: number; min?: number;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      step={step}
      min={min}
      style={{ width: "100%", background: "#03050a", border: "1.5px solid #292e3a", padding: "14px 18px", borderRadius: 24, color: "#f0f3f8", fontSize: "0.9rem", outline: "none", opacity: disabled ? 0.5 : 1 }}
      onFocus={e => { if (!disabled) { e.currentTarget.style.borderColor = "#e03a1a"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(224,58,26,0.3)" } }}
      onBlur={e => { e.currentTarget.style.borderColor = "#292e3a"; e.currentTarget.style.boxShadow = "none" }}
    />
  )
}

function PriceCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{ background: "linear-gradient(145deg,#10141e,#090c12)", borderRadius: 28, padding: "20px 16px", textAlign: "center", marginBottom: 24, borderBottom: `2px solid ${accent}` }}>
      <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 2, fontWeight: 600, color: "#ff734c" }}>{label}</div>
      <div style={{ fontSize: "clamp(1.8rem,3vw,2.7rem)", fontWeight: 800, color: "white", lineHeight: 1.2, marginTop: 8, wordBreak: "break-word" }}>{value}</div>
      <div style={{ fontSize: "0.7rem", color: "#8a99aa" }}>{sub}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #1e222d", fontSize: "0.85rem" }}>
      <span style={{ color: "#ccddee" }}>{label}</span>
      <span style={{ color: "#ff7b58", fontWeight: 600 }}>{value}</span>
    </div>
  )
}
