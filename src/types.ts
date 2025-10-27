export type Product = {
  id: string;
  name: string;
  icon: string;
  description: string;
  specs: string;
  price: number;
};

export type CategoriesData = Record<string, Product[]>;
