// Format phone number to +XX (XXX) XXX XX XX
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return "";
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");
  
  // Handle Turkish format (10 digits starting with 5, or 11 with leading 0)
  if (digits.length === 10 && digits.startsWith("5")) {
    // 5550000005 -> +90 (555) 000 00 05
    return `+90 (${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
  } else if (digits.length === 11 && digits.startsWith("05")) {
    // 05550000005 -> +90 (555) 000 00 05
    return `+90 (${digits.slice(1, 4)}) ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`;
  } else if (digits.length === 12 && digits.startsWith("90")) {
    // 905550000005 -> +90 (555) 000 00 05
    return `+90 (${digits.slice(2, 5)}) ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  
  // Return as-is if format doesn't match
  return phone;
};

// Format province to uppercase
export const formatProvince = (province: string): string => {
  if (!province) return "";
  return province.toUpperCase();
};

// Format district to title case (first letter uppercase)
export const formatDistrict = (district: string): string => {
  if (!district) return "";
  return district
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Format all location data
export const formatLocationData = (data: any) => {
  return {
    ...data,
    phone: formatPhoneNumber(data.phone),
    province: formatProvince(data.province),
    district: formatDistrict(data.district),
  };
};
