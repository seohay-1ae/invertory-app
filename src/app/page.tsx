"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Part } from "@/types/Part";

export default function PartsPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [search, setSearch] = useState("");
  const [formPart, setFormPart] = useState<Partial<Part>>({}); // 등록/수정용 폼

  // 데이터 가져오기
  const fetchParts = async () => {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    let filteredParts = data as Part[];

    if (search.trim() !== "") {
      const lowerSearch = search.toLowerCase();
      filteredParts = filteredParts.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerSearch) ||
          p.aliase.some((a) => a.toLowerCase().includes(lowerSearch))
      );
    }

    setParts(filteredParts);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchParts();
  }, [search]);

  // 등록
  const handleAddPart = async () => {
    if (!formPart.name || !formPart.aliase) {
      alert("부품명과 별칭은 필수입니다.");
      return;
    }

    const { error } = await supabase.from("inventory").insert([
      {
        name: formPart.name,
        aliase: (formPart.aliase as string).split(",").map((a) => a.trim()),
        vehicle_stock: formPart.vehicle_stock ?? 0,
        warehouse_stock: formPart.warehouse_stock ?? 0,
        price: formPart.price ?? 0,
      },
    ]);

    if (error) {
      console.error(error);
      alert("부품 등록 실패");
    } else {
      setFormPart({});
      fetchParts();
    }
  };

  // 수정
  const handleUpdatePart = async () => {
    if (!formPart.id) return;

    const updateData: Partial<Part> = { ...formPart };

    if (typeof updateData.aliase === "string") {
      updateData.aliase = updateData.aliase.split(",").map((a) => a.trim());
    }

    const { error } = await supabase.from("inventory").update(updateData).eq("id", formPart.id);

    if (error) {
      console.error(error);
      alert("수정 실패");
    } else {
      setFormPart({});
      fetchParts();
    }
  };

  // 삭제
  const handleDeletePart = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    const { error } = await supabase.from("inventory").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert("삭제 실패");
    } else {
      fetchParts();
    }
  };

  // 테이블 행 클릭 -> 폼으로 데이터 보내기
  const handleSelectPart = (part: Part) => {
    setFormPart({
      id: part.id,
      name: part.name,
      aliase: part.aliase.join(", "),
      vehicle_stock: part.vehicle_stock,
      warehouse_stock: part.warehouse_stock,
      price: part.price,
    });
  };

  // 폼 초기화
  const handleClearForm = () => {
    setFormPart({});
  };

  // 부품값 입력 시 숫자만
  const handlePriceChange = (value: string) => {
    const num = Number(value.replace(/,/g, ""));
    setFormPart({ ...formPart, price: isNaN(num) ? 0 : num });
  };

  return (
    <div
      style={{
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      {/* 검색 */}
      <div>
        <label style={{ display: "block", fontWeight: 600, marginBottom: "4px", color: "#2b52c0ff" }}>검색:</label>
        <div style={{ position: "relative", width: "100%" }}>
          <input
            type="text"
            placeholder="부품명 또는 별칭 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 30px 8px 8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              boxSizing: "border-box",
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                position: "absolute",
                right: "5px",
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "16px",
                color: "#888",
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 등록/수정 폼 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* 1행: 부품명 + 별칭 (1:2 비율) */}
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontWeight: 500, marginBottom: "2px" }}>부품명</label>
            <input
              value={formPart.name ?? ""}
              onChange={(e) => setFormPart({ ...formPart, name: e.target.value })}
              style={{ width: "100%", padding: "6px", border: "1px solid #ccc", borderRadius: "4px" }}
            />
          </div>

          <div style={{ flex: 2 }}>
            <label style={{ display: "block", fontWeight: 500, marginBottom: "2px", color: "#2b52c0ff" }}>
              별칭 (쉼표 구분)
            </label>
            <input
              value={formPart.aliase ?? ""}
              onChange={(e) => setFormPart({ ...formPart, aliase: e.target.value })}
              style={{ width: "100%", padding: "6px", border: "1px solid #ccc", borderRadius: "4px" }}
            />
          </div>
        </div>

        {/* 2행: 차량재고, 창고재고, 부품값 (동일 비율) */}
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontWeight: 500, marginBottom: "2px" }}>차량재고</label>
            <input
              type="number"
              value={formPart.vehicle_stock ?? 0}
              onChange={(e) => setFormPart({ ...formPart, vehicle_stock: Number(e.target.value) })}
              style={{ width: "100%", padding: "6px", border: "1px solid #ccc", borderRadius: "4px" }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontWeight: 500, marginBottom: "2px" }}>창고재고</label>
            <input
              type="number"
              value={formPart.warehouse_stock ?? 0}
              onChange={(e) => setFormPart({ ...formPart, warehouse_stock: Number(e.target.value) })}
              style={{ width: "100%", padding: "6px", border: "1px solid #ccc", borderRadius: "4px" }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontWeight: 500, marginBottom: "2px" }}>부품값</label>
            <input
              value={(formPart.price ?? 0).toLocaleString()}
              onChange={(e) => handlePriceChange(e.target.value)}
              style={{ width: "100%", padding: "6px", border: "1px solid #ccc", borderRadius: "4px" }}
            />
          </div>
        </div>
      </div>

      {/* 버튼 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
        <button
          style={{
            width: "100%",
            backgroundColor: "#35e074ff",
            color: "black",
            fontWeight: 600,
            padding: "4px 8px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            boxShadow: "none",
          }}
          onClick={formPart.id ? handleUpdatePart : handleAddPart}
        >
          {formPart.id ? "수정 / 저장" : "등록"}
        </button>

        <button
          style={{
            width: "100%",
            backgroundColor: "#ff9b53ff",
            color: "black",
            fontWeight: 600,
            padding: "4px 8px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            boxShadow: "none",
          }}
          onClick={handleClearForm}
        >
          폼 초기화
        </button>
      </div>

      {/* 부품 테이블 */}
      <div style={{ overflowX: "auto", marginTop: "16px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc" }}>
          <thead>
            <tr style={{ backgroundColor: "#f3f3f3" }}>
              <th style={{ border: "1px solid #ccc", padding: "4px" }}>부품명</th>
              <th style={{ border: "1px solid #ccc", padding: "4px" }}>별칭</th>
              <th style={{ border: "1px solid #ccc", padding: "4px" }}>차량</th>
              <th style={{ border: "1px solid #ccc", padding: "4px" }}>창고</th>
              <th style={{ border: "1px solid #ccc", padding: "4px" }}>가격</th>
              <th style={{ border: "1px solid #ccc", padding: "4px" }}>삭제</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => (
              <tr key={part.id} style={{ cursor: "pointer" }} onClick={() => handleSelectPart(part)}>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{part.name}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{part.aliase.join(", ")}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{part.vehicle_stock}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{part.warehouse_stock}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{part.price.toLocaleString()}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>
                  <button
                    style={{
                      backgroundColor: "#ef4444",
                      color: "#fff",
                      fontWeight: 600,
                      padding: "2px 4px",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "none",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePart(part.id);
                    }}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
