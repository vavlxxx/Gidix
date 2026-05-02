export function DataTable({ columns, rows, getKey = (row) => row.id, emptyText = "Нет записей" }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.title}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getKey(row)}>
              {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="table-empty">{emptyText}</p>}
    </div>
  );
}
