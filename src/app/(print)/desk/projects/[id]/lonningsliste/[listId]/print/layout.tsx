/**
 * Liggende A4 ved utskrift slik at alle kolonner i lønningslisten får plass.
 */
export default function PayrollPrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media print {
  @page {
    size: A4 landscape;
    margin: 10mm 12mm;
  }
}
`,
        }}
      />
      {children}
    </>
  );
}
