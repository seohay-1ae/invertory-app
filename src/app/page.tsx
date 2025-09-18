"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Part } from "@/types/Part";
import { useToast } from "@/components/ui/toast";

export default function PartsPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [search, setSearch] = useState("");
  const [allParts, setAllParts] = useState<Part[]>([]); // 전체 부품 데이터 저장용
  const [showLowStock, setShowLowStock] = useState(false); // 재고 부족 필터 상태
  const [showZeroVehicleStock, setShowZeroVehicleStock] = useState(false); // 차량재고 0 필터 상태
  const [highlightedPartId, setHighlightedPartId] = useState<number | null>(null); // 하이라이트할 부품 ID
  type FormPart = Omit<Part, "aliase"> & { aliase?: string | string[] };
  const [formPart, setFormPart] = useState<Partial<FormPart>>({});
  const { showToast } = useToast();


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

    const allPartsData = data as Part[];
    setAllParts(allPartsData); // 전체 데이터 저장

    let filteredParts = allPartsData;

    // 검색 필터
    if (search.trim() !== "") {
      const lowerSearch = search.toLowerCase().replace(/\s/g, ""); // 공백 제거
      filteredParts = filteredParts.filter((p) => {
        const name = p.name.toLowerCase().replace(/\s/g, "");
        const aliase = (p.aliase ?? []).map((a) => a.toLowerCase().replace(/\s/g, ""));
        return name.includes(lowerSearch) || aliase.some((a) => a.includes(lowerSearch));
      });
    }

    // 재고 부족 필터 (차량재고 + 창고재고 <= 3)
    if (showLowStock) {
      filteredParts = filteredParts.filter((p) => {
        // 문자열이나 숫자를 모두 숫자로 변환
        const vehicleStock = p.vehicle_stock === "" || p.vehicle_stock === null || p.vehicle_stock === undefined 
          ? 0 
          : (typeof p.vehicle_stock === "number" ? p.vehicle_stock : Number(p.vehicle_stock) || 0);
        
        const warehouseStock = p.warehouse_stock === "" || p.warehouse_stock === null || p.warehouse_stock === undefined 
          ? 0 
          : (typeof p.warehouse_stock === "number" ? p.warehouse_stock : Number(p.warehouse_stock) || 0);
        
        return vehicleStock + warehouseStock <= 3;
      });
    }

    // 차량재고 0 필터
    if (showZeroVehicleStock) {
      filteredParts = filteredParts.filter((p) => {
        const vehicleStock = p.vehicle_stock === "" || p.vehicle_stock === null || p.vehicle_stock === undefined 
          ? 0 
          : (typeof p.vehicle_stock === "number" ? p.vehicle_stock : Number(p.vehicle_stock) || 0);
        
        return vehicleStock === 0;
      });
    }

    setParts(filteredParts);
  };

  useEffect(() => {
    fetchParts();
  }, [search, showLowStock, showZeroVehicleStock]);

  // string 또는 string[]를 배열로 변환
  const normalizeAliase = (value: string | string[] | undefined): string[] => {
    if (!value) return [];
    if (typeof value === "string") return value.split(",").map((a) => a.trim());
    return value;
  };

  // 부품명 중복 체크 (띄어쓰기 무시)
  const checkDuplicatePart = (partName: string): Part | null => {
    const normalizedInput = partName.toLowerCase().replace(/\s/g, "");
    
    return allParts.find(part => {
      const normalizedPartName = part.name.toLowerCase().replace(/\s/g, "");
      return normalizedPartName === normalizedInput;
    }) || null;
  };

  // 등록
  const handleAddPart = async () => {
    if (!formPart.name || !formPart.aliase) {
      alert("부품명과 별칭은 필수입니다.");
      return;
    }

    // 중복 체크
    const duplicatePart = checkDuplicatePart(formPart.name);
    if (duplicatePart) {
      showToast("이미 등록된 부품입니다", "warning");
      // 중복된 부품으로 검색하여 결과 표시
      setSearch(duplicatePart.name);
      // 폼 초기화
      setFormPart({});
      return;
    }

    const { error } = await supabase.from("inventory").insert([
      {
        name: formPart.name,
        aliase: normalizeAliase(formPart.aliase),
        vehicle_stock: formPart.vehicle_stock,
        warehouse_stock: formPart.warehouse_stock,
        price: formPart.price,
      },
    ]);

    if (error) {
      console.error(error);
      alert("부품 등록 실패");
    } else {
      setFormPart({});
      fetchParts();
      showToast("부품이 성공적으로 등록되었습니다", "success");
    }
  };

  // 수정
  const handleUpdatePart = async () => {
    if (!formPart.id) return;

     // formPart.aliase를 string[]로 변환
  const updateData: Partial<Part> = {
    ...formPart,
    aliase: normalizeAliase(formPart.aliase),
  };

    const { error } = await supabase
      .from("inventory")
      .update(updateData)
      .eq("id", formPart.id);

    if (error) {
      console.error(error);
      showToast("수정 실패", "error");
    } else {
      setFormPart({});
      fetchParts();
      showToast("부품이 성공적으로 수정되었습니다", "success");
      highlightPart(formPart.id); // 수정된 부품 하이라이트
    }
  };

  // 삭제
  const handleDeletePart = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    const { error } = await supabase.from("inventory").delete().eq("id", id);

    if (error) {
      console.error(error);
      showToast("삭제 실패", "error");
    } else {
      // 폼 초기화
      setFormPart({});
      // 테이블 갱신
      fetchParts();
      showToast("부품이 성공적으로 삭제되었습니다", "success");
    }
};

  // 테이블 행 클릭 -> 폼으로 데이터 보내기
const handleSelectPart = (part: Part) => {
  setFormPart({
    id: part.id,
    name: part.name,
    aliase: (part.aliase ?? []).join(", ") as string,
    vehicle_stock: part.vehicle_stock,
    warehouse_stock: part.warehouse_stock,
    price: part.price,
  });
};



  // 폼 초기화
  const handleClearForm = () => setFormPart({});

  // 부품값 입력 시 숫자만
  const handlePriceChange = (value: string) => {
    // 숫자와 빈 문자열만 허용
    if (value === "" || /^\d+$/.test(value)) {
      const num = value === "" ? "" : Number(value);
      setFormPart({ ...formPart, price: num });
    }
  };

  // 재고 입력 시 숫자만
  const handleStockChange = (field: 'vehicle_stock' | 'warehouse_stock', value: string) => {
    // 숫자와 빈 문자열만 허용
    if (value === "" || /^\d+$/.test(value)) {
      const num = value === "" ? "" : Number(value);
      setFormPart({ ...formPart, [field]: num });
    }
  };

  // 부품 하이라이트 함수
  const highlightPart = (partId: number) => {
    setHighlightedPartId(partId);
    setTimeout(() => {
      setHighlightedPartId(null);
    }, 2000); // 2초 후 하이라이트 제거
  };

  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* 검색 */}
      <div>
        <label style={{ display: "block", fontWeight: 600, marginBottom: "4px", color: "#2b52c0ff" }}>검색:</label>
        <div style={{ position: "relative", width: "100%" }}>
          <input
            type="text"
            placeholder="부품명 또는 별칭 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "8px 30px 8px 8px", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box" }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{ position: "absolute", right: "5px", top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", fontSize: "16px", color: "#888" }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 등록/수정 폼 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* 1행: 부품명 + 별칭 */}
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
              value={typeof formPart.aliase === "string" ? formPart.aliase : (formPart.aliase ?? []).join(", ")}
              onChange={(e) => setFormPart({ ...formPart, aliase: e.target.value })}
              style={{ width: "100%", padding: "6px", border: "1px solid #ccc", borderRadius: "4px" }}
            />
          </div>
        </div>

        {/* 2행: 차량재고, 창고재고, 부품값 */}
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontWeight: 500, marginBottom: "2px" }}>차량재고</label>
            <input
              type="text"
              value={formPart.vehicle_stock === "" || formPart.vehicle_stock === undefined || formPart.vehicle_stock === null ? "" : String(formPart.vehicle_stock)}
              onChange={(e) => handleStockChange('vehicle_stock', e.target.value)}
              style={{ width: "100%", padding: "6px", border: "1px solid #ccc", borderRadius: "4px" }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontWeight: 500, marginBottom: "2px" }}>창고재고</label>
            <input
              type="text"
              value={formPart.warehouse_stock === "" || formPart.warehouse_stock === undefined || formPart.warehouse_stock === null ? "" : String(formPart.warehouse_stock)}
              onChange={(e) => handleStockChange('warehouse_stock', e.target.value)}
              style={{ width: "100%", padding: "6px", border: "1px solid #ccc", borderRadius: "4px" }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontWeight: 500, marginBottom: "2px" }}>부품값</label>
            <input
              type="text"
              value={formPart.price === "" || formPart.price === undefined || formPart.price === null ? "" : String(formPart.price)}
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

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            style={{
              flex: 1,
              backgroundColor: showZeroVehicleStock ? "#1e40af" : "#3b82f6",
              color: "white",
              fontWeight: 600,
              padding: "4px 8px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              boxShadow: "none",
            }}
            onClick={() => setShowZeroVehicleStock(!showZeroVehicleStock)}
          >
            {showZeroVehicleStock ? "전체 부품 보기" : "차량재고 0인 부품 보기"}
          </button>

          <button
            style={{
              flex: 1,
              backgroundColor: showLowStock ? "#1e40af" : "#3b82f6",
              color: "white",
              fontWeight: 600,
              padding: "4px 8px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              boxShadow: "none",
            }}
            onClick={() => setShowLowStock(!showLowStock)}
          >
            {showLowStock ? "전체 부품 보기" : "3개 이하인 부품 보기"}
          </button>
        </div>
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
              <tr 
                key={part.id} 
                style={{ 
                  cursor: "pointer",
                  backgroundColor: highlightedPartId === part.id ? "#fef3c7" : "transparent",
                  transition: "background-color 0.3s ease"
                }} 
                onClick={() => handleSelectPart(part)}
              >
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{part.name}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{(part.aliase ?? []).join(", ")}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{part.vehicle_stock === "" ? "" : part.vehicle_stock}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{part.warehouse_stock === "" ? "" : part.warehouse_stock}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{part.price === "" ? "" : (typeof part.price === "number" ? part.price.toLocaleString() : (part.price && !isNaN(Number(part.price)) ? Number(part.price).toLocaleString() : part.price))}</td>
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
