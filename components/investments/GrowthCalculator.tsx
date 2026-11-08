"use client";

import { useMemo, useState } from "react";
import { Decimal } from "@/lib/decimal";
import { project, readNumber, RULES, type Projection } from "@/lib/projections";
import Field from "./Field";
import ProjectionChart from "./ProjectionChart";
import { money, signedMoney } from "./format";
import planner from "../DreamVault.module.css";
import vault from "../Vault.module.css";
import styles from "./planning.module.css";

interface Scenario {
  name: string;
  returnPct: string;
}

/** Illustrative starting assumptions. People can change every one of them. */
const DEFAULT_SCENARIOS: Scenario[] = [
  { name: "Conservative", returnPct: "3" },
  { name: "Moderate", returnPct: "5" },
  { name: "Optimistic", returnPct: "7" },
];
const SCENARIO_COLORS = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)"];

/**
 * Hypothetical growth calculator. It works only from the numbers typed here and
 * never reads or changes recorded holdings (except copying your portfolio value
 * into the starting amount when you ask it to).
 */
export default function GrowthCalculator({ portfolioValue }: { portfolioValue: Decimal }) {
  const [start, setStart] = useState("10000");
  const [monthly, setMonthly] = useState("250");
  const [years, setYears] = useState("20");
  const [increase, setIncrease] = useState("");
  const [inflation, setInflation] = useState("");
  const [scenarios, setScenarios] = useState<Scenario[]>(DEFAULT_SCENARIOS);
  const [todaysMoney, setTodaysMoney] = useState(false);
  const [tableIndex, setTableIndex] = useState(1);

  const fields = {
    start: readNumber(start, { what: "the starting amount", required: true, ...RULES.amount }),
    monthly: readNumber(monthly, { what: "the monthly contribution", required: false, ...RULES.amount }),
    years: readNumber(years, { what: "the number of years", required: true, ...RULES.years }),
    increase: readNumber(increase, { what: "the yearly increase", required: false, ...RULES.increasePct }),
    inflation: readNumber(inflation, { what: "inflation", required: false, ...RULES.inflationPct }),
  };
  const scenarioReturns = scenarios.map((s) =>
    readNumber(s.returnPct, { what: "the yearly return", required: true, ...RULES.returnPct }),
  );
  const scenarioNameErrors = scenarios.map((s) =>
    !s.name.trim() ? "Give this scenario a name." : s.name.trim().length > 20 ? "Keep it to 20 characters." : undefined,
  );
  const valid =
    Object.values(fields).every((f) => !f.error) && scenarioReturns.every((r) => !r.error) && scenarioNameErrors.every((e) => !e);

  const results = useMemo(() => {
    if (!valid) return null;
    const base = {
      start: fields.start.value!,
      monthly: fields.monthly.value!,
      years: fields.years.value!.toNumber(),
      contributionIncreasePct: fields.increase.value!,
      inflationPct: fields.inflation.value!,
    };
    return {
      scenarios: scenarioReturns.map((r) => project({ ...base, annualReturnPct: r.value! })),
      noGrowth: project({ ...base, annualReturnPct: Decimal.ZERO }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, start, monthly, years, increase, inflation, JSON.stringify(scenarios)]);

  const hasInflation = Boolean(fields.inflation.value?.isPositive());
  const showReal = todaysMoney && hasInflation;
  const pick = (row: Projection["years"][number]) => (showReal ? row.realValue : row.value);
  const numberOf = (d: Decimal) => d.toNumber();

  const updateScenario = (index: number, change: Partial<Scenario>) =>
    setScenarios((list) => list.map((s, i) => (i === index ? { ...s, ...change } : s)));

  const tableProjection = results?.scenarios[tableIndex];

  return (
    <section aria-labelledby="view-title" className={styles.page}>
      <div className={vault.toolbar}>
        <div>
          <h2 id="view-title" tabIndex={-1} data-view-heading className={vault.viewTitle}>
            Growth calculator
          </h2>
          <p className={vault.viewSubtitle}>
            Explore how money could grow under different assumptions. This is separate from your tracked holdings and
            never changes them.
          </p>
        </div>
      </div>

      <div className={styles.calcGrid}>
        <form className={`${vault.card} ${styles.calcInputs}`} onSubmit={(e) => e.preventDefault()} noValidate aria-label="Calculator inputs">
          <h3 className={vault.cardTitle}>Your plan</h3>
          <Field id="calc-start" label="Starting amount" inputMode="decimal" prefix="£" value={start} onChange={setStart} error={fields.start.error} />
          {portfolioValue.isPositive() && (
            <button type="button" className={styles.linkButton} onClick={() => setStart(portfolioValue.toFixed(2))}>
              Use my current portfolio value ({money(portfolioValue)})
            </button>
          )}
          <Field id="calc-monthly" label="Monthly contribution" inputMode="decimal" prefix="£" value={monthly} onChange={setMonthly} error={fields.monthly.error} />
          <Field id="calc-years" label="How many years" inputMode="decimal" suffix="years" value={years} onChange={setYears} error={fields.years.error} hint="1 to 60." />
          <Field
            id="calc-increase"
            label={<>Yearly contribution increase <span className={vault.optional}>(optional)</span></>}
            inputMode="decimal"
            suffix="%"
            value={increase}
            onChange={setIncrease}
            error={fields.increase.error}
            hint="E.g. 3 if you'll pay in 3% more each year."
            placeholder="0"
          />
          <Field
            id="calc-inflation"
            label={<>Inflation <span className={vault.optional}>(optional)</span></>}
            inputMode="decimal"
            suffix="%"
            value={inflation}
            onChange={setInflation}
            error={fields.inflation.error}
            hint="Lets you see results in today's money."
            placeholder="0"
          />

          <fieldset className={styles.scenarioFieldset}>
            <legend className={planner.label}>Scenarios to compare</legend>
            <p className={planner.hint}>Illustrative assumptions you can change. They aren&rsquo;t predictions.</p>
            <div className={styles.scenarioHeader} aria-hidden="true">
              <span>Name</span>
              <span>Yearly return</span>
            </div>
            {scenarios.map((scenario, index) => (
              <div key={index} className={styles.scenarioRow}>
                <span className={styles.scenarioSwatch} style={{ background: SCENARIO_COLORS[index] }} aria-hidden="true" />
                <Field
                  id={`scenario-name-${index}`}
                  label={<span className="visually-hidden">Scenario {index + 1} name</span>}
                  value={scenario.name}
                  onChange={(name) => updateScenario(index, { name })}
                  error={scenarioNameErrors[index]}
                  maxLength={20}
                />
                <Field
                  id={`scenario-return-${index}`}
                  label={<span className="visually-hidden">{scenario.name || `Scenario ${index + 1}`} yearly return</span>}
                  inputMode="decimal"
                  suffix="%"
                  value={scenario.returnPct}
                  onChange={(returnPct) => updateScenario(index, { returnPct })}
                  error={scenarioReturns[index].error}
                />
              </div>
            ))}
          </fieldset>
        </form>

        <div className={styles.calcResults}>
          {!results ? (
            <p className={styles.empty}>Fix the highlighted fields to see your projection.</p>
          ) : (
            <>
              <div className={styles.resultCards}>
                {results.scenarios.map((p, index) => (
                  <ResultCard
                    key={index}
                    name={scenarios[index].name}
                    rate={`${scenarioReturns[index].value!.toString()}% a year`}
                    color={SCENARIO_COLORS[index]}
                    projection={p}
                    showReal={hasInflation}
                  />
                ))}
                <ResultCard name="No growth" rate="0% a year" projection={results.noGrowth} showReal={hasInflation} dashed />
              </div>

              <article className={vault.card} aria-labelledby="calc-chart-title">
                <div className={styles.chartHead}>
                  <h3 id="calc-chart-title" className={vault.cardTitle}>
                    Projected value
                  </h3>
                  <span className={styles.illustrative}>Hypothetical</span>
                </div>
                {hasInflation && (
                  <label className={styles.checkbox}>
                    <input type="checkbox" checked={todaysMoney} onChange={(e) => setTodaysMoney(e.target.checked)} />
                    Show in today&rsquo;s money (adjusted for {fields.inflation.value!.toString()}% inflation)
                  </label>
                )}
                <ProjectionChart
                  series={[
                    ...results.scenarios.map((p, index) => ({
                      id: `s${index}`,
                      label: scenarios[index].name.slice(0, 12),
                      values: p.years.map((row) => numberOf(pick(row))),
                      color: SCENARIO_COLORS[index],
                    })),
                    { id: "none", label: "No growth", values: results.noGrowth.years.map((row) => numberOf(pick(row))), color: "", dashed: true },
                  ]}
                  formatValue={(n) => money(Decimal.of(n.toFixed(2)))}
                  summary={`Projected value over ${fields.years.value!.toString()} years${showReal ? " in today's money" : ""}: ${results.scenarios
                    .map((p, i) => `${scenarios[i].name} ${money(showReal ? p.realFinalValue : p.finalValue)}`)
                    .join(", ")}; no growth ${money(showReal ? results.noGrowth.realFinalValue : results.noGrowth.finalValue)}.`}
                />
              </article>

              <article className={vault.card} aria-labelledby="calc-table-title">
                <div className={styles.chartHead}>
                  <h3 id="calc-table-title" className={vault.cardTitle}>
                    Year by year
                  </h3>
                  <fieldset className={vault.segmented}>
                    <legend className="visually-hidden">Scenario shown in the table</legend>
                    {scenarios.map((s, index) => (
                      <label key={index} className={`${vault.segment} ${tableIndex === index ? vault.segmentActive : ""}`}>
                        <input
                          type="radio"
                          name="table-scenario"
                          checked={tableIndex === index}
                          onChange={() => setTableIndex(index)}
                          className="visually-hidden"
                        />
                        {s.name}
                      </label>
                    ))}
                  </fieldset>
                </div>
                {tableProjection && (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <caption className="visually-hidden">
                        Year-by-year projection for the {scenarios[tableIndex].name} scenario
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Year</th>
                          <th scope="col" className={styles.num}>Paid in</th>
                          <th scope="col" className={styles.num}>Growth</th>
                          <th scope="col" className={styles.num}>Value</th>
                          {hasInflation && <th scope="col" className={styles.num}>In today&rsquo;s money</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {tableProjection.years.slice(1).map((row) => (
                          <tr key={row.year}>
                            <th scope="row">{row.year}</th>
                            <td className={styles.num}>{money(row.contributed)}</td>
                            <td className={`${styles.num} ${row.growth.isNegative() ? styles.negative : ""}`}>{signedMoney(row.growth)}</td>
                            <td className={styles.num}>{money(row.value)}</td>
                            {hasInflation && <td className={styles.num}>{money(row.realValue)}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>

              <p className={styles.method}>
                <strong>How this is worked out:</strong> each month the balance grows by the yearly return ÷ 12, then that
                month&rsquo;s contribution is added. Contribution increases apply once a year. &ldquo;Today&rsquo;s money&rdquo;
                divides by (1 + inflation) for each year. Real returns vary from year to year and can be negative; these
                figures are illustrations, not forecasts or advice.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ResultCard({
  name,
  rate,
  color,
  projection,
  showReal,
  dashed = false,
}: {
  name: string;
  rate: string;
  color?: string;
  projection: Projection;
  showReal: boolean;
  dashed?: boolean;
}) {
  return (
    <article className={styles.resultCard}>
      <p className={styles.resultName}>
        <span
          className={`${styles.resultKey} ${dashed ? styles.resultKeyDashed : ""}`}
          style={dashed ? undefined : { borderTopColor: color }}
          aria-hidden="true"
        />
        {name} <span className={styles.resultRate}>{rate}</span>
      </p>
      <p className={styles.resultValue}>{money(projection.finalValue)}</p>
      <dl className={styles.resultList}>
        <div>
          <dt>Paid in</dt>
          <dd>{money(projection.contributed)}</dd>
        </div>
        <div>
          <dt>Growth</dt>
          <dd className={projection.growth.isNegative() ? styles.negative : undefined}>{signedMoney(projection.growth)}</dd>
        </div>
        {showReal && (
          <div>
            <dt>In today&rsquo;s money</dt>
            <dd>{money(projection.realFinalValue)}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}
