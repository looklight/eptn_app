import type { CategoriesData } from './types';

export const categoriesData: CategoriesData = {
  category1: [
    { id:'c1_1', name:'3VA1', icon:'⚡️', description:'Basic MCCB', specs:'Termal-Magnetic Trip Unit with No COM', price:450 },
    { id:'c1_2', name:'3VA2', icon:'⚡️⚡️', description:'Standard MCCB', specs:'Electronic Trip Unit with No COM', price:895 },
    { id:'c1_3', name:'3VA2 + COM800', icon:'⚡️⚡️⚡️', description:'High Feature MCCB + COM module', specs:'Electronic Trip Unit with Profinet and Modbus COM', price:1310 }
  ],
  category2: [
    { id:'c2_1', name:'Standard Motor Starter', icon:'⚙️', description:'Star-Delta Motor Starter', specs:'Basic Electro-Mechanical Starter', price:145 },
    { id:'c2_2', name:'Soft Starter 3RW50/3RW52', icon:'⚙️⚙️', description:'Standard Soft Starter', specs:'Standard Soft Starter with COM capabilities', price:455 },
    { id:'c2_3', name:'Soft Starter 3RW55', icon:'⚙️⚙️⚙️', description:'High Feature Soft Starter', specs:'High Feature Soft Starter with enhanced COM capabilities', price:715 }
  ],
  category3: [
    { id:'c3_1', name:'Standard Motor Starter', icon:'⚙️', description:'Motor Protection + Contactor', specs:'Standard Electro-Mechanical Combination', price:450 },
    { id:'c3_2', name:'Motor Starter with Intelligent Link Module', icon:'⚙️⚙️', description:'Intelligent Link Module 3RC7', specs:'Standard Electro-Mechanical Combination + 3RC7', price:1050 },
    { id:'c3_3', name:'eStarter', icon:'⚙️⚙️⚙️', description:'Electronic Motor Starter for ET200SP', specs:'Complete Electronic Starter', price:2250 }
  ],
  category4: [
    { id:'c4_1', name:'No Supervision System', icon:'👨🏻‍💻', description:'N/A', specs:'N/A', price:0 },
    { id:'c4_2', name:'Powercenter3000', icon:'👨🏻‍💻👨🏻‍💻', description:'Energy Monitoring System', specs:'Designed for Energy Monitoring', price:1005 },
    { id:'c4_3', name:'PLC S7-1500', icon:'👨🏻‍💻👨🏻‍💻👨🏻‍💻', description:'Programmable Logic Controller', specs:'Designed for Automation System', price:1805 }
  ]
};
