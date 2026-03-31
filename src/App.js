import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function App() {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("model");
  const [selectedAtolye, setSelectedAtolye] = useState("Tümü");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("kapama_history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("kapama_history", JSON.stringify(history));
  }, [history]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws);

      const processed = processData(json);
      setData(processed);
      setFiltered(processed);

      setHistory((prev) => [
        ...prev,
        {
          date: new Date().toLocaleString(),
          count: processed.length,
        },
      ]);
    };

    reader.readAsBinaryString(file);
  };

  useEffect(() => {
    let temp = [...data];

    if (selectedAtolye !== "Tümü") {
      temp = temp.filter((d) => d.atolye === selectedAtolye);
    }

    if (search) {
      temp = temp.filter((d) =>
        d.model.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFiltered(temp);
  }, [search, selectedAtolye, data]);

  const processData = (rows) => {
    return rows
      .filter((r) => r["Sipariş Tipi"] == 1 || r["Sipariş Tipi"] == 3)
      .map((r) => {
        const u = Number(r["Üretim"] || 0);
        const u1 = Number(r["Üretim 1A"] || 0);
        const u2 = Number(r["Üretim 2K"] || 0);
        const fazla = Number(r["Üretim Fazlası"] || 0);

        const total = u + u1 + u2 + fazla;

        const hasTasnif = r["Tasnif"] !== undefined && r["Tasnif"] !== "";

        const ref = hasTasnif
          ? Number(r["Tasnif"])
          : Number(r["Kesim"] || 0);

        const refType = hasTasnif ? "TAS" : "KES";

        const diff = total - ref;

        const percent = ref > 0 ? Math.round((total / ref) * 100) : 0;

        const error =
          (!hasTasnif && !r["Kesim"]) || r["Model"] === undefined;

        return {
          model: r["Model"] || "-",
          atolye: r["Atölye"] || "-",
          siparis: Number(r["Sipariş"] || 0),
          total,
          ref,
          refType,
          diff,
          percent,
          error,
        };
      });
  };

  const eksiList = filtered.filter((d) => d.diff < 0);
  const hataList = filtered.filter((d) => d.error);

  const istasyonAnaliz = () => {
    const map = {};
    data.forEach((d) => {
      if (d.diff < 0) {
        map[d.atolye] = (map[d.atolye] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  const atolyeler = [
    "Tümü",
    ...Array.from(new Set(data.map((d) => d.atolye))),
  ];

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("kapama_history");
  };

  return (
    <div className="p-6 bg-[#0b1220] text-white min-h-screen">
      <div className="flex justify-between mb-4">
        <h1 className="text-xl font-bold">KAPAMA • Pijama Üretim</h1>
        <button onClick={clearHistory} className="bg-red-500 px-2 py-1 rounded">
          Geçmiş Sil
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <input type="file" onChange={handleFile} />
        <input
          placeholder="Model ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-2 py-1 bg-gray-800 rounded"
        />
      </div>

      <div className="flex gap-2 mb-4">
        {atolyeler.map((a, i) => (
          <button
            key={i}
            onClick={() => setSelectedAtolye(a)}
            className={`px-3 py-1 rounded ${
              selectedAtolye === a ? "bg-blue-500" : "bg-gray-700"
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      <div className="flex gap-4 mb-4">
        <button onClick={() => setActiveTab("model")}>Model</button>
        <button onClick={() => setActiveTab("eksi")}>
          Eksi ({eksiList.length})
        </button>
        <button onClick={() => setActiveTab("hata")}>
          Hatalı ({hataList.length})
        </button>
        <button onClick={() => setActiveTab("istasyon")}>İstasyon</button>
      </div>

      {activeTab === "model" && <Table data={filtered} />}
      {activeTab === "eksi" && <Table data={eksiList} />}
      {activeTab === "hata" && <Table data={hataList} />}

      {activeTab === "istasyon" && (
        <div>
          {istasyonAnaliz().map(([k, v], i) => (
            <div key={i}>
              {k}: {v} model eksi
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Table({ data }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th>Model</th>
          <th>Atölye</th>
          <th>Sipariş</th>
          <th>Üretim</th>
          <th>Referans</th>
          <th>Tip</th>
          <th>Fark</th>
          <th>%</th>
        </tr>
      </thead>
      <tbody>
        {data.map((d, i) => (
          <tr key={i}>
            <td>{d.model}</td>
            <td>{d.atolye}</td>
            <td>{d.siparis}</td>
            <td>{d.total}</td>
            <td>{d.ref}</td>
            <td>{d.refType}</td>
            <td>{d.diff}</td>
            <td>{d.percent}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
