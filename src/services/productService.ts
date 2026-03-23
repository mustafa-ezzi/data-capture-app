import { collection, addDoc, getDocs, Timestamp,FieldValue } from "firebase/firestore";
import { db } from "../firebase/config";
export interface Product {
  name: string;
  category: string;
  brand?: string;
  price?: string;
  unit_of_measure: string;
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