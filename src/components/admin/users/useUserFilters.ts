import { useState, useMemo, useCallback } from "react";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  province: string;
  district: string;
  address: string;
  created_at: string;
}

const initialFilters = {
  searchName: "",
  searchSurname: "",
  searchEmail: "",
  searchPhone: "",
  searchProvince: "",
  searchDistrict: "",
  searchAddress: "",
  dateFrom: "",
  dateTo: "",
};

export function useUserFilters(users: User[]) {
  const [filters, setFilters] = useState(initialFilters);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSortChange = useCallback((newSortBy: string) => {
    if (newSortBy === sortBy) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(newSortBy);
      setSortOrder("asc");
    }
  }, [sortBy]);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setSortBy("created_at");
    setSortOrder("desc");
  }, []);

  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Apply filters
    if (filters.searchName) {
      const search = filters.searchName.toLowerCase();
      result = result.filter((u) =>
        (u.first_name || "").toLowerCase().includes(search)
      );
    }
    if (filters.searchSurname) {
      const search = filters.searchSurname.toLowerCase();
      result = result.filter((u) =>
        (u.last_name || "").toLowerCase().includes(search)
      );
    }
    if (filters.searchEmail) {
      const search = filters.searchEmail.toLowerCase();
      result = result.filter((u) =>
        (u.email || "").toLowerCase().includes(search)
      );
    }
    if (filters.searchPhone) {
      const search = filters.searchPhone.replace(/\D/g, "");
      result = result.filter((u) =>
        (u.phone || "").replace(/\D/g, "").includes(search)
      );
    }
    if (filters.searchProvince) {
      result = result.filter((u) => u.province === filters.searchProvince);
    }
    if (filters.searchDistrict) {
      result = result.filter((u) => u.district === filters.searchDistrict);
    }
    if (filters.searchAddress) {
      const search = filters.searchAddress.toLowerCase();
      result = result.filter((u) =>
        (u.address || "").toLowerCase().includes(search)
      );
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter((u) => new Date(u.created_at) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((u) => new Date(u.created_at) <= to);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal: any = a[sortBy as keyof User] || "";
      let bVal: any = b[sortBy as keyof User] || "";

      if (sortBy === "created_at") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, filters, sortBy, sortOrder]);

  return {
    filters,
    sortBy,
    sortOrder,
    filteredUsers,
    handleFilterChange,
    handleSortChange,
    resetFilters,
  };
}
