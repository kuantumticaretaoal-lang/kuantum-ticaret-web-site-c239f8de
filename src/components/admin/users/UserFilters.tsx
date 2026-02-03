import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, ArrowUpDown } from "lucide-react";
import { TURKISH_PROVINCES, getDistrictsByProvince } from "@/lib/turkish-locations";

interface UserFiltersProps {
  filters: {
    searchName: string;
    searchSurname: string;
    searchEmail: string;
    searchPhone: string;
    searchProvince: string;
    searchDistrict: string;
    searchAddress: string;
    dateFrom: string;
    dateTo: string;
  };
  sortBy: string;
  sortOrder: "asc" | "desc";
  onFilterChange: (key: string, value: string) => void;
  onSortChange: (sortBy: string) => void;
  onReset: () => void;
}

export const UserFilters = ({
  filters,
  sortBy,
  sortOrder,
  onFilterChange,
  onSortChange,
  onReset,
}: UserFiltersProps) => {
  const districts = filters.searchProvince
    ? getDistrictsByProvince(filters.searchProvince)
    : [];

  return (
    <div className="space-y-4 mb-6 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold flex items-center gap-2">
          <Search className="h-4 w-4" />
          Arama ve Filtreleme
        </h3>
        <Button variant="outline" size="sm" onClick={onReset}>
          <X className="h-4 w-4 mr-1" />
          Temizle
        </Button>
      </div>
      
      {/* Row 1: Name, Surname, Email, Phone */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">Ad</Label>
          <Input
            placeholder="Ada göre ara..."
            value={filters.searchName}
            onChange={(e) => onFilterChange("searchName", e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Soyad</Label>
          <Input
            placeholder="Soyada göre ara..."
            value={filters.searchSurname}
            onChange={(e) => onFilterChange("searchSurname", e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">E-posta</Label>
          <Input
            placeholder="E-postaya göre ara..."
            value={filters.searchEmail}
            onChange={(e) => onFilterChange("searchEmail", e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Telefon</Label>
          <Input
            placeholder="Telefona göre ara..."
            value={filters.searchPhone}
            onChange={(e) => onFilterChange("searchPhone", e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      {/* Row 2: Province, District, Address */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">İl</Label>
          <Select
            value={filters.searchProvince}
            onValueChange={(v) => {
              onFilterChange("searchProvince", v);
              onFilterChange("searchDistrict", "");
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Tüm iller" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tüm İller</SelectItem>
              {TURKISH_PROVINCES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">İlçe</Label>
          <Select
            value={filters.searchDistrict}
            onValueChange={(v) => onFilterChange("searchDistrict", v)}
            disabled={!filters.searchProvince}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Tüm ilçeler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tüm İlçeler</SelectItem>
              {districts.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Adres</Label>
          <Input
            placeholder="Adrese göre ara..."
            value={filters.searchAddress}
            onChange={(e) => onFilterChange("searchAddress", e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      {/* Row 3: Date range and sorting */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">Kayıt Başlangıç</Label>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange("dateFrom", e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Kayıt Bitiş</Label>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFilterChange("dateTo", e.target.value)}
            className="h-9"
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Sıralama</Label>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="h-9 flex-1">
                <SelectValue placeholder="Sıralama seç" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Kayıt Tarihi</SelectItem>
                <SelectItem value="first_name">Ad</SelectItem>
                <SelectItem value="last_name">Soyad</SelectItem>
                <SelectItem value="email">E-posta</SelectItem>
                <SelectItem value="province">İl</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3"
              onClick={() => onSortChange(sortBy)}
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortOrder === "asc" ? "A-Z" : "Z-A"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
