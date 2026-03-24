import { collection, addDoc, getDocs, Timestamp, FieldValue } from "firebase/firestore";
import { db } from "../firebase/config";

export interface Measurement {
  label: string;   // e.g. "Length", "Diameter"
  value: string;   // e.g. "6"
  unit: string;    // e.g. "m", "mm"
}

export interface Product {
  name: string;
  category?: string;
  brand?: string;
  price?: string;
  currency: string;          // e.g. "PKR", "USD"
  price_unit?: string;       // e.g. "kg", "ft", "pcs" — the "per X" unit
  quantity?: string;         // e.g. "500"
  quantity_unit?: string;    // e.g. "pcs", "kg"
  unit_of_measure: string;   // backward compat — derived from first measurement unit
  measurements: Measurement[];
  description: string;
  image_urls: string[];
  variants_color: string[];
  variants_size: string[];
  status: string;
  language: string;
  created_at?: Timestamp | FieldValue;
  updated_at?: Timestamp | FieldValue;
}

const productsRef = collection(db, "products");

export const addProduct = async (product: Product) => {
  return await addDoc(productsRef, product);
};

export const getProducts = async () => {
  const snapshot = await getDocs(productsRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};