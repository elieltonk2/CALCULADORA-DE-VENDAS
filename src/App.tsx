/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Receipt, 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  ChevronRight,
  AlertCircle,
  Edit2,
  X,
  Sun,
  Moon,
  BarChart3,
  Crown,
  ShieldCheck,
  Zap,
  History,
  ArrowRight,
  ArrowLeft,
  Check,
  QrCode,
  Copy,
  Users,
  Loader2,
  FileText,
  LogOut,
  LogIn,
  User as UserIcon,
  Cloud,
  CloudOff,
  RefreshCw,
  Image as ImageIcon,
  Upload,
  Rocket,
  Briefcase,
  CheckCircle2,
  UserPlus,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot, 
  query, 
  where,
  getDocFromServer,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, signInWithGoogle, logout, storage } from './firebase';
import { SplashScreen } from './components/SplashScreen';
import { InAppPurchaseModal } from './components/InAppPurchaseModal';
import { SettingsModal } from './components/SettingsModal';
import { Button } from './components/Button';
import { useMonetization } from './hooks/useMonetization';
import { PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { initAdMob, showBanner, hideBanner, showInterstitial, showRewarded } from './services/adService';

// --- Types ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends React.Component<any, any> {
  public state: any;
  public props: any;
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
          <Card className="max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h1 className="text-xl font-bold mb-2">Ops! Algo deu errado</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm">
              Ocorreu um erro inesperado. Tente recarregar a página ou entre em contato com o suporte.
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Recarregar Aplicativo
            </Button>
            {this.state.error && (
              <pre className="mt-6 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] text-left overflow-auto max-h-40 text-zinc-500">
                {this.state.error.message}
              </pre>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

interface Product {
  id: string;
  name: string;
  packageType: string;
  quantityPackages: number;
  unitsPerPackage: number;
  totalCost: number;
  unitCost: number;
  totalUnits: number;
  currentStock: number; // Estoque atual
  minStock: number;     // Alerta de estoque baixo
  // Preços de Venda
  singleUnitPrice: number;
  bulkQuantity: number;
  bulkPrice: number;
  imageUrl?: string;
}

interface Sale {
  id: string;
  date: string;
  productId: string;
  productName: string;
  quantity: number; // Quantidade de unidades individuais vendidas
  unitPrice: number; // Preço de venda de 1 unidade
  unitCostAtSale: number;
  revenue: number;
  totalCost: number;
  profit: number;
  customerId?: string;
  paymentStatus?: 'paid' | 'pending';
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  totalDebt: number;
  createdAt: string;
}

interface Expense {
  id: string;
  date: string;
  description: string;
  value: number;
}

interface TesterList {
  id: string;
  name: string;
  emails: string[];
  createdAt: string;
}

type Tab = 'summary' | 'products' | 'sales' | 'expenses' | 'analytics' | 'customers';

// --- Components ---

const Card = ({ children, className = "", noStyles = false, ...props }: { children: React.ReactNode; className?: string; noStyles?: boolean } & React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={`rounded-2xl shadow-sm overflow-hidden ${!noStyles ? 'bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800' : ''} ${className}`} 
    {...props}
  >
    {children}
  </div>
);



const Input = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 ml-1">{label}</label>
    <input 
      autoComplete="off"
      {...props}
      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 dark:focus:ring-white/5 focus:border-zinc-900 dark:focus:border-zinc-500 transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
    />
  </div>
);

const Select = ({ label, children, ...props }: { label: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 ml-1">{label}</label>
    <select 
      {...props}
      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 dark:focus:ring-white/5 focus:border-zinc-900 dark:focus:border-zinc-500 transition-all appearance-none text-zinc-900 dark:text-zinc-100"
    >
      {children}
    </select>
  </div>
);

// --- Main App ---

// --- Helper Functions ---

const resizeImage = (file: File, width: number, height: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Object-fit: cover logic
        const imgRatio = img.width / img.height;
        const targetRatio = width / height;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgRatio > targetRatio) {
          drawHeight = height;
          drawWidth = img.width * (height / img.height);
          offsetX = (width - drawWidth) / 2;
          offsetY = 0;
        } else {
          drawWidth = width;
          drawHeight = img.height * (width / img.width);
          offsetX = 0;
          offsetY = (height - drawHeight) / 2;
        }

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        }, 'image/png');
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const { 
    isPro, 
    offering, 
    isPurchasing, 
    handlePurchase, 
    handleRestore 
  } = useMonetization(user?.uid);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingScreenshots, setIsGeneratingScreenshots] = useState(false);

  const [remainingTime, setRemainingTime] = useState<number>(() => {
    const saved = localStorage.getItem('vendapro_remaining_time');
    return saved ? parseInt(saved, 10) : 3600; // 1 hora inicial
  });

  useEffect(() => {
    if (isPro) return;
    
    const timer = setInterval(() => {
      setRemainingTime(prev => {
        const next = Math.max(0, prev - 1);
        localStorage.setItem('vendapro_remaining_time', next.toString());
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPro]);

  const handleBuyClick = async (pkg: PurchasesPackage) => {
    try {
      const success = await handlePurchase(pkg);
      if (success) {
        setShowIapModal(false);
      }
    } catch (error) {
      alert("Erro ao processar compra. Tente novamente.");
    }
  };

  const handleRestoreClick = async () => {
    try {
      const success = await handleRestore();
      if (success) {
        alert("Compras restauradas com sucesso!");
        setShowIapModal(false);
      } else {
        alert("Nenhuma compra encontrada para restaurar.");
      }
    } catch (error) {
      alert("Erro ao restaurar compras.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      console.error("Usuário não autenticado");
      return;
    }

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("A imagem é muito grande. O limite é 2MB.");
      return;
    }

    setIsUploading(true);
    try {
      // Usar Date.now() + Math.random() para maior compatibilidade que crypto.randomUUID()
      const fileId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      const safeFileName = (file.name || 'image.jpg').replace(/[^a-zA-Z0-9.]/g, '_');
      const fileName = `${fileId}-${safeFileName}`;
      const storageRef = ref(storage, `products/${user.uid}/${fileName}`);
      
      console.log("Iniciando upload para:", storageRef.fullPath);
      
      const snapshot = await uploadBytes(storageRef, file);
      console.log("Upload concluído, obtendo URL...");
      
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log("URL obtida:", downloadURL);
      
      setNewProduct(prev => ({ ...prev, imageUrl: downloadURL }));
      
      // Limpar o input para permitir selecionar o mesmo arquivo novamente se necessário
      e.target.value = '';
    } catch (error: any) {
      console.error("Erro detalhado no upload:", error);
      
      let message = "Erro ao fazer upload da imagem.";
      if (error.code === 'storage/unauthorized') {
        message = "Sem permissão para upload. Verifique as regras do Firebase Storage.";
      } else if (error.code === 'storage/canceled') {
        message = "Upload cancelado.";
      }
      
      alert(message);
    } finally {
      setIsUploading(false);
    }
  };


  const [isPendingPro, setIsPendingPro] = useState(false);
  const [showIapModal, setShowIapModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalType, setLegalType] = useState<'privacy' | 'terms'>('privacy');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('gestor_theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    // Simular carregamento inicial
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Auth Listener
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).then(() => {
      return onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);
        setIsAuthReady(true);
        
        if (firebaseUser) {
          // Check if user is PRO in Firestore
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              if (userData.isPendingPro !== undefined) {
                setIsPendingPro(userData.isPendingPro);
              }
            } else {
              // Create user doc if it doesn't exist
              await setDoc(doc(db, 'users', firebaseUser.uid), {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                createdAt: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error("Error checking user data:", error);
          }
        }
      });
    });
  }, []);

  // Test Connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    localStorage.setItem('gestor_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('vendapro_is_pro', String(isPro));
  }, [isPro]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        alert("O login foi cancelado. Tente novamente.");
      } else if (error.code === 'auth/popup-blocked') {
        alert("O popup de login foi bloqueado pelo navegador. Por favor, permita popups para este site.");
      } else {
        alert("Erro ao realizar login. Tente novamente mais tarde.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setShowSettingsModal(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    const confirmDelete = window.confirm(
      "TEM CERTEZA? Esta ação é IRREVERSÍVEL. Todos os seus dados (produtos, vendas, gastos) serão excluídos permanentemente em até 7 dias."
    );

    if (confirmDelete) {
      try {
        // 1. Marcar para exclusão no Firestore
        await setDoc(doc(db, 'users', user.uid), { 
          deleteRequested: true, 
          deleteRequestedAt: new Date().toISOString() 
        }, { merge: true });

        // 2. Tentar excluir do Firebase Auth
        await user.delete();
        
        alert("Sua conta foi marcada para exclusão. Você será deslogado agora.");
        handleLogout();
      } catch (error: any) {
        console.error("Erro ao excluir conta:", error);
        if (error.code === 'auth/requires-recent-login') {
          alert("Por segurança, você precisa sair e entrar novamente antes de excluir sua conta.");
        } else {
          alert("Erro ao solicitar exclusão. Entre em contato com o suporte.");
        }
      }
    }
  };

  const handleExportPDF = () => {
    if (!isPro) {
      setShowIapModal(true);
      return;
    }

    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('pt-BR');

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text('Relatório de Desempenho - VendaPro', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${dateStr}`, 14, 30);

    // Summary Stats
    autoTable(doc, {
      startY: 40,
      head: [['Métrica', 'Valor']],
      body: [
        ['Faturamento Total', formatCurrency(totals.revenue)],
        ['Custo de Produtos', formatCurrency(totals.costOfGoods)],
        ['Lucro Bruto', formatCurrency(totals.grossProfit)],
        ['Despesas Gerais', formatCurrency(totals.totalExpenses)],
        ['Lucro Líquido', formatCurrency(totals.netProfit)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [248, 249, 250], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // Sales Table
    doc.setFontSize(14);
    doc.text('Histórico de Vendas', 14, (doc as any).lastAutoTable.finalY + 15);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Data', 'Produto', 'Qtd', 'Faturamento', 'Lucro']],
      body: sales.map(s => [
        new Date(s.date).toLocaleDateString('pt-BR'),
        s.productName,
        s.quantity,
        formatCurrency(s.revenue),
        formatCurrency(s.profit)
      ]),
    });

    doc.save(`relatorio-vendapro-${dateStr.replace(/\//g, '-')}.pdf`);
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // Persistência de Dados (LocalStorage)
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('gestor_products');
    return saved ? JSON.parse(saved) : [];
  });
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('gestor_sales');
    return saved ? JSON.parse(saved) : [];
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('gestor_expenses');
    return saved ? JSON.parse(saved) : [];
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('gestor_customers');
    return saved ? JSON.parse(saved) : [];
  });
  const [testerLists, setTesterLists] = useState<TesterList[]>([]);
  const [selectedTesterListId, setSelectedTesterListId] = useState<string | null>(null);
  const [isAddingTesterList, setIsAddingTesterList] = useState(false);

  // Firestore Sync
  useEffect(() => {
    if (!user || !isPro || !isAuthReady) return;

    setSyncing(true);
    
    // Sync Products
    const unsubProducts = onSnapshot(collection(db, 'users', user.uid, 'products'), (snapshot) => {
      const remoteProducts = snapshot.docs.map(doc => doc.data() as Product);
      if (remoteProducts.length > 0) {
        setProducts(prev => {
          // Merge logic: prefer remote if different
          const merged = [...remoteProducts];
          return merged;
        });
      }
      setLastSync(new Date());
      setSyncing(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/products`));

    // Sync Sales
    const unsubSales = onSnapshot(collection(db, 'users', user.uid, 'sales'), (snapshot) => {
      const remoteSales = snapshot.docs.map(doc => doc.data() as Sale);
      if (remoteSales.length > 0) {
        setSales(remoteSales);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/sales`));

    // Sync Expenses
    const unsubExpenses = onSnapshot(collection(db, 'users', user.uid, 'expenses'), (snapshot) => {
      const remoteExpenses = snapshot.docs.map(doc => doc.data() as Expense);
      if (remoteExpenses.length > 0) {
        setExpenses(remoteExpenses);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/expenses`));

    // Sync Customers
    const unsubCustomers = onSnapshot(collection(db, 'users', user.uid, 'customers'), (snapshot) => {
      const remoteCustomers = snapshot.docs.map(doc => doc.data() as Customer);
      if (remoteCustomers.length > 0) {
        setCustomers(remoteCustomers);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/customers`));

    // Sync Tester Lists
    const unsubTesterLists = onSnapshot(collection(db, 'users', user.uid, 'testerLists'), (snapshot) => {
      const remoteTesterLists = snapshot.docs.map(doc => doc.data() as TesterList);
      setTesterLists(remoteTesterLists);
      if (remoteTesterLists.length > 0 && !selectedTesterListId) {
        setSelectedTesterListId(remoteTesterLists[0].id);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/testerLists`));

    return () => {
      unsubProducts();
      unsubSales();
      unsubExpenses();
      unsubCustomers();
      unsubTesterLists();
    };
  }, [user, isPro, isAuthReady]);

  // Save to Firestore when local changes occur (only if PRO and logged in)
  const syncToFirestore = async (collectionName: string, data: any[]) => {
    if (!user || !isPro) return;
    
    try {
      const batch = writeBatch(db);
      data.forEach(item => {
        const docRef = doc(db, 'users', user.uid, collectionName, item.id);
        batch.set(docRef, { ...item, ownerId: user.uid });
      });
      await batch.commit();
      setLastSync(new Date());
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/${collectionName}`);
    }
  };

  // Salvar sempre que houver mudanças
  useEffect(() => {
    localStorage.setItem('gestor_products', JSON.stringify(products));
    if (user && isPro) syncToFirestore('products', products);
  }, [products, user, isPro]);

  useEffect(() => {
    localStorage.setItem('gestor_sales', JSON.stringify(sales));
    if (user && isPro) syncToFirestore('sales', sales);
  }, [sales, user, isPro]);

  useEffect(() => {
    localStorage.setItem('gestor_expenses', JSON.stringify(expenses));
    if (user && isPro) syncToFirestore('expenses', expenses);
  }, [expenses, user, isPro]);

  useEffect(() => {
    localStorage.setItem('gestor_customers', JSON.stringify(customers));
    if (user && isPro) syncToFirestore('customers', customers);
  }, [customers, user, isPro]);

  // Calculations
  const totals = useMemo(() => {
    const revenue = sales.reduce((acc, s) => acc + s.revenue, 0);
    const costOfGoods = sales.reduce((acc, s) => acc + s.totalCost, 0);
    const grossProfit = revenue - costOfGoods;
    const totalExpenses = expenses.reduce((acc, e) => acc + e.value, 0);
    const netProfit = grossProfit - totalExpenses;

    return { revenue, costOfGoods, grossProfit, totalExpenses, netProfit };
  }, [sales, expenses]);

  const productPerformance = useMemo(() => {
    return products.map(product => {
      const productSales = sales.filter(s => s.productId === product.id);
      const totalRevenue = productSales.reduce((acc, s) => acc + s.revenue, 0);
      const totalCost = productSales.reduce((acc, s) => acc + s.totalCost, 0);
      const totalProfit = totalRevenue - totalCost;
      const totalQuantity = productSales.reduce((acc, s) => acc + s.quantity, 0);
      
      return {
        id: product.id,
        name: product.name,
        totalRevenue,
        totalCost,
        totalProfit,
        totalQuantity
      };
    }).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [products, sales]);

  const [newProduct, setNewProduct] = useState({
    name: '',
    packageType: '',
    quantityPackages: '',
    unitsPerPackage: '',
    totalCost: '',
    singleUnitPrice: '',
    bulkQuantity: '',
    bulkPrice: '',
    minStock: '10',
    imageUrl: ''
  });

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [restockProductId, setRestockProductId] = useState<string | null>(null);
  const [restockQuantity, setRestockQuantity] = useState('');

  const startEditing = (product: Product) => {
    setEditingProductId(product.id);
    setNewProduct({
      name: product.name,
      packageType: product.packageType,
      quantityPackages: product.quantityPackages.toString(),
      unitsPerPackage: product.unitsPerPackage.toString(),
      totalCost: product.totalCost.toString(),
      singleUnitPrice: product.singleUnitPrice.toString(),
      bulkQuantity: product.bulkQuantity.toString(),
      bulkPrice: product.bulkPrice.toString(),
      minStock: (product.minStock || 10).toString(),
      imageUrl: product.imageUrl || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEditingSale = (sale: Sale) => {
    setEditingSaleId(sale.id);
    setSelectedProductId(sale.productId);
    setSaleQuantity(sale.quantity.toString());
    setSaleTotalValue(sale.revenue.toString());
    setSelectedCustomerId(sale.customerId || '');
    setIsFiado(sale.paymentStatus === 'pending');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEditingExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    // We'll use a local state for expense form to make it easier
    setNewExpense({
      description: expense.description,
      value: expense.value.toString(),
      date: expense.date
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEditingCustomer = (customer: Customer) => {
    setEditingCustomerId(customer.id);
    setNewCustomer({
      name: customer.name,
      phone: customer.phone || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [newExpense, setNewExpense] = useState({
    description: '',
    value: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: ''
  });

  const cancelEditing = () => {
    setEditingProductId(null);
    setEditingSaleId(null);
    setEditingExpenseId(null);
    setNewProduct({
      name: '',
      packageType: '',
      quantityPackages: '',
      unitsPerPackage: '',
      totalCost: '',
      singleUnitPrice: '',
      bulkQuantity: '',
      bulkPrice: ''
    });
    setSaleQuantity('');
    setSaleTotalValue('');
    setSelectedProductId('');
    setSelectedCustomerId('');
    setIsFiado(false);
    setEditingCustomerId(null);
    setNewCustomer({ name: '', phone: '' });
    setNewExpense({
      description: '',
      value: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const addProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isPro && remainingTime <= 0) {
      setShowIapModal(true);
      return;
    }
    const { name, packageType, quantityPackages, unitsPerPackage, totalCost, singleUnitPrice, bulkQuantity, bulkPrice, minStock, imageUrl } = newProduct;
    
    const totalUnits = Number(quantityPackages) * Number(unitsPerPackage);
    const unitCost = totalUnits > 0 ? Number(totalCost) / totalUnits : 0;

    if (editingProductId) {
      setProducts(products.map(p => p.id === editingProductId ? {
        ...p,
        name,
        packageType,
        quantityPackages: Number(quantityPackages),
        unitsPerPackage: Number(unitsPerPackage),
        totalCost: Number(totalCost),
        unitCost,
        totalUnits,
        currentStock: p.currentStock + (totalUnits - p.totalUnits), // Ajuste de estoque se mudar a compra
        singleUnitPrice: Number(singleUnitPrice),
        bulkQuantity: Number(bulkQuantity),
        bulkPrice: Number(bulkPrice),
        minStock: Number(minStock),
        imageUrl
      } : p));
      setEditingProductId(null);
    } else {
      const product: Product = {
        id: crypto.randomUUID(),
        name,
        packageType,
        quantityPackages: Number(quantityPackages),
        unitsPerPackage: Number(unitsPerPackage),
        totalCost: Number(totalCost),
        unitCost,
        totalUnits,
        currentStock: totalUnits,
        singleUnitPrice: Number(singleUnitPrice),
        bulkQuantity: Number(bulkQuantity),
        bulkPrice: Number(bulkPrice),
        minStock: Number(minStock),
        imageUrl
      };
      setProducts([...products, product]);
    }

    setNewProduct({
      name: '',
      packageType: '',
      quantityPackages: '',
      unitsPerPackage: '',
      totalCost: '',
      singleUnitPrice: '',
      bulkQuantity: '',
      bulkPrice: '',
      minStock: '10',
      imageUrl: ''
    });
  };

  const lowStockProducts = useMemo(() => 
    products.filter(p => p.currentStock <= p.minStock),
    [products]
  );

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const daySales = sales.filter(s => s.date === date);
      const revenue = daySales.reduce((acc, s) => acc + s.revenue, 0);
      const profit = daySales.reduce((acc, s) => acc + s.profit, 0);
      const formattedDate = new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      return { date: formattedDate, revenue, profit };
    });
  }, [sales]);

  const salesByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    sales.forEach(s => {
      categories[s.productName] = (categories[s.productName] || 0) + s.revenue;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [sales]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isFiado, setIsFiado] = useState(false);
  const [saleQuantity, setSaleQuantity] = useState<string>('');
  const [saleTotalValue, setSaleTotalValue] = useState<string>('');

  const selectedProduct = useMemo(() => 
    products.find(p => p.id === selectedProductId), 
    [products, selectedProductId]
  );

  const [newTesterList, setNewTesterList] = useState({
    name: '',
    emails: ''
  });

  const handleSaveTesterList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isPro) return;

    const emailArray = newTesterList.emails
      .split(/[\n,]+/)
      .map(email => email.trim())
      .filter(email => email && isValidEmail(email));

    if (emailArray.length === 0) {
      alert("Por favor, insira pelo menos um e-mail válido.");
      return;
    }

    const list: TesterList = {
      id: crypto.randomUUID(),
      name: newTesterList.name,
      emails: emailArray,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'users', user.uid, 'testerLists', list.id), { ...list, ownerId: user.uid });
      setIsAddingTesterList(false);
      setNewTesterList({ name: '', emails: '' });
      setSelectedTesterListId(list.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/testerLists/${list.id}`);
    }
  };

  const handleDeleteTesterList = async (id: string) => {
    if (!user || !isPro) return;
    if (!confirm("Tem certeza que deseja excluir esta lista?")) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'testerLists', id));
      if (selectedTesterListId === id) {
        setSelectedTesterListId(testerLists.find(l => l.id !== id)?.id || null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/testerLists/${id}`);
    }
  };

  const handleQuantityChange = (val: string) => {
    setSaleQuantity(val);
    if (selectedProduct && val) {
      const qty = Number(val);
      if (isNaN(qty)) return;
      const combos = Math.floor(qty / selectedProduct.bulkQuantity);
      const remainders = qty % selectedProduct.bulkQuantity;
      
      const totalValue = (combos * selectedProduct.bulkPrice) + (remainders * selectedProduct.singleUnitPrice);
      setSaleTotalValue(totalValue.toFixed(2));
    }
  };

  const handleTotalValueChange = (val: string) => {
    setSaleTotalValue(val);
    if (selectedProduct && val) {
      const money = Number(val);
      if (isNaN(money)) return;
      const combos = Math.floor(money / selectedProduct.bulkPrice);
      const remainingMoney = Number((money % selectedProduct.bulkPrice).toFixed(2));
      const extraUnits = Math.floor(remainingMoney / selectedProduct.singleUnitPrice);
      
      const totalUnits = (combos * selectedProduct.bulkQuantity) + extraUnits;
      setSaleQuantity(totalUnits.toString());
    }
  };

  const addSale = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isPro && remainingTime <= 0) {
      setShowIapModal(true);
      return;
    }
    if (!selectedProduct) return;

    const quantity = Number(saleQuantity);
    const revenue = Number(saleTotalValue);
    const unitPrice = quantity > 0 ? revenue / quantity : 0;
    const totalCost = quantity * selectedProduct.unitCost;
    const profit = revenue - totalCost;

    if (editingSaleId) {
      const oldSale = sales.find(s => s.id === editingSaleId);
      if (oldSale) {
        // Devolver estoque da venda antiga
        setProducts(prev => prev.map(p => p.id === oldSale.productId ? { ...p, currentStock: p.currentStock + oldSale.quantity } : p));
        
        // Se era fiado, abater do débito do cliente antigo
        if (oldSale.paymentStatus === 'pending' && oldSale.customerId) {
          setCustomers(prev => prev.map(c => c.id === oldSale.customerId ? { ...c, totalDebt: Math.max(0, c.totalDebt - oldSale.revenue) } : c));
        }
      }

      const paymentStatus = isFiado ? 'pending' : 'paid';
      const customerId = selectedCustomerId || undefined;

      setSales(sales.map(s => s.id === editingSaleId ? {
        ...s,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity,
        unitPrice,
        unitCostAtSale: selectedProduct.unitCost,
        revenue,
        totalCost,
        profit,
        date: (e.currentTarget.elements.namedItem('date') as HTMLInputElement).value,
        customerId,
        paymentStatus
      } : s));
      
      // Abater novo estoque
      setProducts(prev => prev.map(p => p.id === selectedProduct.id ? { ...p, currentStock: p.currentStock - quantity } : p));
      
      // Se é fiado, adicionar ao débito do novo cliente
      if (paymentStatus === 'pending' && customerId) {
        setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, totalDebt: c.totalDebt + revenue } : c));
      }

      setEditingSaleId(null);
      setIsFiado(false);
      setSelectedCustomerId('');
    } else {
      const paymentStatus = isFiado ? 'pending' : 'paid';
      const customerId = selectedCustomerId || undefined;

      const newSale: Sale = {
        id: crypto.randomUUID(),
        date: (e.currentTarget.elements.namedItem('date') as HTMLInputElement).value,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity,
        unitPrice,
        unitCostAtSale: selectedProduct.unitCost,
        revenue,
        totalCost,
        profit,
        customerId,
        paymentStatus
      };
      setSales([newSale, ...sales]);
      
      // Abater estoque
      setProducts(prev => prev.map(p => p.id === selectedProduct.id ? { ...p, currentStock: p.currentStock - quantity } : p));

      // Se é fiado, adicionar ao débito do cliente
      if (paymentStatus === 'pending' && customerId) {
        setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, totalDebt: c.totalDebt + revenue } : c));
      }
    }

    setSaleQuantity('');
    setSaleTotalValue('');
    setSelectedProductId('');
  };

  const addExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { description, value, date } = newExpense;

    if (editingExpenseId) {
      setExpenses(expenses.map(exp => exp.id === editingExpenseId ? {
        ...exp,
        description,
        value: Number(value),
        date
      } : exp));
      setEditingExpenseId(null);
    } else {
      const newExpenseItem: Expense = {
        id: crypto.randomUUID(),
        date,
        description,
        value: Number(value)
      };
      setExpenses([newExpenseItem, ...expenses]);
    }

    setNewExpense({
      description: '',
      value: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const addCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { name, phone } = newCustomer;

    if (editingCustomerId) {
      setCustomers(customers.map(c => c.id === editingCustomerId ? {
        ...c,
        name,
        phone
      } : c));
      setEditingCustomerId(null);
    } else {
      const newCustomerItem: Customer = {
        id: crypto.randomUUID(),
        name,
        phone,
        totalDebt: 0,
        createdAt: new Date().toISOString()
      };
      setCustomers([newCustomerItem, ...customers]);
    }

    setNewCustomer({ name: '', phone: '' });
  };

  const deleteItem = (type: Tab, id: string) => {
    if (type === 'products') setProducts(products.filter(p => p.id !== id));
    if (type === 'sales') {
      const saleToDelete = sales.find(s => s.id === id);
      if (saleToDelete) {
        // Devolver estoque
        setProducts(prev => prev.map(p => p.id === saleToDelete.productId ? { ...p, currentStock: p.currentStock + saleToDelete.quantity } : p));
        
        // Se era fiado, abater do débito do cliente
        if (saleToDelete.paymentStatus === 'pending' && saleToDelete.customerId) {
          setCustomers(prev => prev.map(c => c.id === saleToDelete.customerId ? { ...c, totalDebt: Math.max(0, c.totalDebt - saleToDelete.revenue) } : c));
        }
      }
      setSales(sales.filter(s => s.id !== id));
    }
    if (type === 'expenses') setExpenses(expenses.filter(e => e.id !== id));
    if (type === 'customers') setCustomers(customers.filter(c => c.id !== id));
  };

  const handleRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProductId) return;
    const qty = parseInt(restockQuantity);
    if (isNaN(qty) || qty <= 0) return;

    setProducts(prev => prev.map(p => p.id === restockProductId ? { ...p, currentStock: p.currentStock + qty } : p));
    setRestockProductId(null);
    setRestockQuantity('');
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!isPro && remainingTime <= 0) {
      setShowIapModal(true);
    }
  }, [isPro, remainingTime]);

  useEffect(() => {
    initAdMob();
  }, []);

  useEffect(() => {
    if (isPro) {
      hideBanner();
    } else {
      showBanner();
    }
  }, [isPro]);

  useEffect(() => {
    if (!isPro && activeTab) {
      // Mostrar intersticial ocasionalmente ao mudar de aba
      if (Math.random() > 0.7) {
        showInterstitial();
      }
    }
  }, [activeTab, isPro]);

  const handleWatchAd = () => {
    showRewarded((amount) => {
      alert(`Obrigado por apoiar o app! +30 minutos ganhos.`);
      setRemainingTime(prev => prev + 1800);
    });
  };

  return (
    <ErrorBoundary>
      <AnimatePresence>
        {showSplash && <SplashScreen />}
      </AnimatePresence>
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 dark:selection:bg-zinc-100 selection:text-white dark:selection:text-zinc-900 transition-colors duration-300">
        {/* Header */}
        <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={18} className="text-white dark:text-zinc-900" />
              </div>
              <h1 className="text-lg font-black tracking-tighter uppercase">VendaPro</h1>
              {isPro ? (
                <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded uppercase tracking-wider">PRO</span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 ${remainingTime < 600 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-zinc-100 text-zinc-600'} dark:bg-zinc-800 dark:text-zinc-400 text-[10px] font-bold rounded uppercase tracking-wider`}>
                    {formatTime(remainingTime)}
                  </span>
                  <button 
                    onClick={handleWatchAd}
                    className="p-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-md hover:bg-emerald-200 transition-colors"
                    title="Ganhar tempo"
                  >
                    <Zap size={12} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-xs font-bold leading-none">{user.displayName}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      {isPro ? (
                        <div className="flex items-center gap-1 text-[9px] text-emerald-500 font-bold uppercase">
                          <Cloud size={10} />
                          Sincronizado
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[9px] text-zinc-400 font-bold uppercase">
                          <CloudOff size={10} />
                          Local
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    title="Configurações"
                  >
                    <UserIcon size={16} />
                  </button>
                </div>
              ) : (
                <Button onClick={handleLogin} variant="secondary" className="py-1.5 px-3 text-xs gap-2">
                  <LogIn size={14} />
                  Entrar
                </Button>
              )}
              
              <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />
              
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>
          </div>
        </header>

        {/* Sidebar Navigation */}
        <nav className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 px-1.5 py-1.5 rounded-2xl shadow-2xl flex items-center gap-0.5 sm:gap-1 w-[95%] sm:w-auto max-w-lg sm:max-w-none">
          <NavButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={<LayoutDashboard size={18} />} label="Início" />
          <NavButton active={activeTab === 'products'} onClick={() => setActiveTab('products')} icon={<Package size={18} />} label="Estoque" />
          <NavButton active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} icon={<ShoppingCart size={18} />} label="Vendas" />
          <NavButton active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<Users size={18} />} label="Clientes" />
          <NavButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<BarChart3 size={18} />} label="Relatórios" />
          <NavButton active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} icon={<Receipt size={18} />} label="Gastos" />
        </nav>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-12 pb-32">
          <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight mb-1 sm:mb-2">VendaPro: Gestão e Lucro</h1>
              <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 font-medium">Controle financeiro inteligente.</p>
            </div>
            <div className="flex items-center justify-between w-full sm:w-auto gap-4">
              <div className="text-left sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-0.5 sm:mb-1">Status do Caixa</p>
                <div className={`text-lg sm:text-xl font-bold ${totals.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(totals.netProfit)}
                </div>
              </div>
              {!isPro && (
                <button 
                  onClick={() => setShowIapModal(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all shadow-sm font-bold text-xs uppercase tracking-wider"
                >
                  <Crown size={14} />
                  Remover Anúncios
                </button>
              )}
            </div>
          </div>

        <AnimatePresence mode="wait">
          {activeTab === 'summary' && (
            <motion.div 
              key="summary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <StatCard label="Faturamento Total" value={totals.revenue} icon={<TrendingUp className="text-emerald-500" />} />
                <StatCard label="Custo de Produtos" value={totals.costOfGoods} icon={<Package className="text-blue-500" />} />
                <StatCard label="Lucro Bruto" value={totals.grossProfit} icon={<DollarSign className="text-zinc-500" />} />
                <StatCard label="Despesas Gerais" value={totals.totalExpenses} icon={<TrendingDown className="text-red-500" />} />
                <StatCard 
                  label="Lucro Líquido" 
                  value={totals.netProfit} 
                  highlight 
                  icon={<TrendingUp className={totals.netProfit >= 0 ? "text-emerald-500" : "text-red-500"} />} 
                />
                {lowStockProducts.length > 0 && (
                  <Card className="p-6 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30">
                    <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-2">
                      <AlertCircle size={20} />
                      <span className="text-xs font-bold uppercase tracking-widest">Alerta de Estoque</span>
                    </div>
                    <p className="text-sm font-bold text-red-700 dark:text-red-300">
                      {lowStockProducts.length} produtos precisam de reposição imediata.
                    </p>
                    <button 
                      onClick={() => setActiveTab('products')}
                      className="mt-3 text-xs font-bold flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline"
                    >
                      Ver produtos <ArrowRight size={12} />
                    </button>
                  </Card>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-6 sm:p-8">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <TrendingUp size={20} className="text-emerald-500" />
                    Lucro por Produto
                  </h3>
                  <div className="space-y-4">
                    {productPerformance.length === 0 ? (
                      <p className="text-sm text-zinc-500 text-center py-8">Nenhuma venda registrada ainda.</p>
                    ) : (
                      productPerformance.map(item => (
                        <div key={item.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{item.name}</h4>
                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${item.totalProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              Lucro: {formatCurrency(item.totalProfit)}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-zinc-400">Vendido</p>
                              <p className="text-sm font-bold">{formatCurrency(item.totalRevenue)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-zinc-400">Custo</p>
                              <p className="text-sm font-bold">{formatCurrency(item.totalCost)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-zinc-400">Unidades</p>
                              <p className="text-sm font-bold">{item.totalQuantity} un.</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                <Card className="p-6 sm:p-8 h-fit">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <AlertCircle size={20} className="text-zinc-400" />
                    Visão Geral do Desempenho
                  </h3>
                  <div className="space-y-6">
                    <ProgressBar label="Margem de Lucro Bruta" value={(totals.grossProfit / (totals.revenue || 1)) * 100} color="bg-emerald-500" />
                    <ProgressBar label="Comprometimento com Despesas" value={(totals.totalExpenses / (totals.grossProfit || 1)) * 100} color="bg-red-500" />
                    
                    <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                      <p className="text-xs text-zinc-500 leading-relaxed italic">
                        * A margem bruta indica quanto sobra após pagar o custo do produto. 
                        O comprometimento mostra quanto do seu lucro bruto está sendo "comido" pelas despesas fixas.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'products' && (
            <motion.div 
              key="products"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-1">
                <Card className="p-6 sticky top-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">{editingProductId ? 'Editar Produto' : 'Novo Produto'}</h2>
                    {editingProductId && (
                      <button onClick={cancelEditing} className="text-zinc-400 hover:text-zinc-600">
                        <X size={20} />
                      </button>
                    )}
                  </div>
                  <form onSubmit={addProduct} className="space-y-4" autoComplete="off">
                    <Input 
                      label="Nome do Produto" 
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      placeholder="Ex: Ovos" 
                      required 
                    />
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">
                        Imagem do Produto
                      </label>
                      <div className="flex flex-col gap-3">
                        {newProduct.imageUrl ? (
                          <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 group">
                            <img 
                              src={newProduct.imageUrl} 
                              alt="Preview" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                            />
                            <button 
                              type="button"
                              onClick={() => setNewProduct(prev => ({ ...prev, imageUrl: '' }))}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center aspect-square w-full rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                            <div className="flex flex-col items-center gap-2 text-zinc-500">
                              {isUploading ? (
                                <Loader2 size={32} className="animate-spin text-emerald-500" />
                              ) : (
                                <>
                                  <ImageIcon size={32} />
                                  <span className="text-xs font-medium">Toque para subir foto</span>
                                </>
                              )}
                            </div>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleFileUpload}
                              disabled={isUploading}
                            />
                          </label>
                        )}
                        <Input 
                          label="Ou cole a URL da Imagem" 
                          value={newProduct.imageUrl}
                          onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})}
                          placeholder="https://exemplo.com/imagem.jpg" 
                        />
                      </div>
                    </div>
                    <Input 
                      label="Tipo de Embalagem" 
                      value={newProduct.packageType}
                      onChange={e => setNewProduct({...newProduct, packageType: e.target.value})}
                      placeholder="Ex: Caixa, Fardo" 
                      required 
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input 
                        label="Qtd de Caixas/Fardos" 
                        type="text" 
                        inputMode="numeric"
                        value={newProduct.quantityPackages}
                        onChange={e => setNewProduct({...newProduct, quantityPackages: e.target.value.replace(/[^0-9]/g, '')})}
                        placeholder="1" 
                        required 
                      />
                      <Input 
                        label="Unidades por Caixa" 
                        type="text" 
                        inputMode="numeric"
                        value={newProduct.unitsPerPackage}
                        onChange={e => setNewProduct({...newProduct, unitsPerPackage: e.target.value.replace(/[^0-9]/g, '')})}
                        placeholder="360" 
                        required 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input 
                        label="Custo Total da Compra (R$)" 
                        type="text" 
                        inputMode="decimal"
                        value={newProduct.totalCost}
                        onChange={e => setNewProduct({...newProduct, totalCost: e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.')})}
                        placeholder="180.00" 
                        required 
                      />
                      <Input 
                        label="Aviso Estoque Baixo" 
                        type="text" 
                        inputMode="numeric"
                        value={newProduct.minStock}
                        onChange={e => setNewProduct({...newProduct, minStock: e.target.value.replace(/[^0-9]/g, '')})}
                        placeholder="10" 
                        required 
                      />
                    </div>
                    
                    <div className="pt-4 border-t border-zinc-100">
                      <h4 className="text-xs font-bold uppercase text-zinc-400 mb-4">Configurar Preços de Venda</h4>
                      <div className="space-y-4">
                        <Input 
                          label="Preço de 1 Unidade (R$)" 
                          type="text" 
                          inputMode="decimal"
                          value={newProduct.singleUnitPrice}
                          onChange={e => setNewProduct({...newProduct, singleUnitPrice: e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.')})}
                          placeholder="Ex: 1.00" 
                          required 
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <Input 
                            label="Qtd do Combo" 
                            type="text" 
                            inputMode="numeric"
                            value={newProduct.bulkQuantity}
                            onChange={e => setNewProduct({...newProduct, bulkQuantity: e.target.value.replace(/[^0-9]/g, '')})}
                            placeholder="Ex: 3" 
                            required 
                          />
                          <Input 
                            label="Preço do Combo (R$)" 
                            type="text" 
                            inputMode="decimal"
                            value={newProduct.bulkPrice}
                            onChange={e => setNewProduct({...newProduct, bulkPrice: e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.')})}
                            placeholder="Ex: 2.00" 
                            required 
                          />
                        </div>
                      </div>
                    </div>

                    <Button type="submit" className="w-full">
                      {editingProductId ? <><Edit2 size={18} /> Salvar Alterações</> : <><Plus size={18} /> Adicionar ao Estoque</>}
                    </Button>
                  </form>
                </Card>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-bold mb-4">Estoque e Custos</h2>
                {products.length === 0 ? (
                  <EmptyState message="Nenhum produto cadastrado." />
                ) : (
                  products.map(product => (
                    <Card key={product.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 overflow-hidden">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Package size={20} className="sm:w-6 sm:h-6" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm sm:text-base">{product.name}</h4>
                          <p className="text-xs sm:text-sm text-zinc-500">
                            {product.quantityPackages} {product.packageType} ({product.totalUnits} un.)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8">
                        <div className="text-left sm:text-right">
                          <p className="text-[9px] sm:text-[10px] font-bold uppercase text-zinc-400">Estoque</p>
                          <p className={`text-sm sm:text-base font-bold ${product.currentStock <= product.minStock ? 'text-red-600 animate-pulse' : 'text-zinc-900 dark:text-zinc-100'}`}>
                            {product.currentStock} un.
                          </p>
                          {product.currentStock <= product.minStock && (
                            <p className="text-[8px] font-bold text-red-500 uppercase">Repor!</p>
                          )}
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-[9px] sm:text-[10px] font-bold uppercase text-zinc-400">Preços</p>
                          <p className="text-[11px] sm:text-xs font-bold text-emerald-600">
                            1 un: {formatCurrency(product.singleUnitPrice)}
                          </p>
                          <p className="text-[11px] sm:text-xs font-bold text-emerald-600">
                            {product.bulkQuantity} un: {formatCurrency(product.bulkPrice)}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-[9px] sm:text-[10px] font-bold uppercase text-zinc-400">Custo un.</p>
                          <p className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(product.unitCost)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button variant="secondary" onClick={() => setRestockProductId(product.id)} className="p-2 px-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100">
                            <Plus size={14} className="sm:w-4 sm:h-4" />
                          </Button>
                          <Button variant="secondary" onClick={() => startEditing(product)} className="p-2 px-2">
                            <Edit2 size={14} className="sm:w-4 sm:h-4" />
                          </Button>
                          <Button variant="danger" onClick={() => deleteItem('products', product.id)} className="p-2 px-2">
                            <Trash2 size={14} className="sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'sales' && (
            <motion.div 
              key="sales"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-1">
                <Card className="p-6 sticky top-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">{editingSaleId ? 'Editar Venda' : 'Registrar Venda'}</h2>
                    {editingSaleId && (
                      <button onClick={cancelEditing} className="text-zinc-400 hover:text-zinc-600">
                        <X size={20} />
                      </button>
                    )}
                  </div>
                  <form onSubmit={addSale} className="space-y-4" autoComplete="off">
                    <Select 
                      label="Produto" 
                      name="productId" 
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      required
                    >
                      <option value="">Selecione um produto</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </Select>

                    <Select 
                      label="Cliente (Opcional)" 
                      name="customerId" 
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                    >
                      <option value="">Venda Direta (Sem Cliente)</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>

                    <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <input 
                        type="checkbox" 
                        id="isFiado" 
                        checked={isFiado} 
                        onChange={(e) => setIsFiado(e.target.checked)}
                        className="w-5 h-5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor="isFiado" className="text-sm font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer flex-1">
                        Venda no Fiado (Débito)
                      </label>
                      {isFiado && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase">Pendente</span>}
                    </div>

                    {selectedProduct && (
                      <div className="space-y-4">
                        {selectedProduct.imageUrl && (
                          <div className="aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                            <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 mb-4">
                          <p className="text-[10px] font-bold uppercase text-emerald-600 mb-1 text-center">Tabela de Preços</p>
                          <div className="flex justify-around text-sm font-bold text-emerald-900">
                            <span>1 un: {formatCurrency(selectedProduct.singleUnitPrice)}</span>
                            <span>{selectedProduct.bulkQuantity} un: {formatCurrency(selectedProduct.bulkPrice)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Input 
                          label="Quantas Unidades?" 
                          name="quantity" 
                          type="text" 
                          inputMode="decimal"
                          value={saleQuantity}
                          onChange={(e) => handleQuantityChange(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
                          placeholder="Ex: 7" 
                          className="text-lg font-bold"
                          required 
                        />
                        <p className="text-[9px] text-zinc-400 px-1">Se o cliente pedir por quantidade</p>
                      </div>
                      <div className="space-y-1">
                        <Input 
                          label="Quanto ele vai pagar?" 
                          name="totalValue" 
                          type="text" 
                          inputMode="decimal"
                          value={saleTotalValue}
                          onChange={(e) => handleTotalValueChange(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
                          placeholder="Ex: 5.00" 
                          className="text-lg font-bold text-emerald-600"
                          required 
                        />
                        <p className="text-[9px] text-zinc-400 px-1">Se o cliente pedir por valor (R$)</p>
                      </div>
                    </div>

                    {selectedProduct && saleQuantity && (
                      <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-zinc-400">Resultado</span>
                          <span className="text-sm font-bold text-zinc-700">
                            {Math.floor(Number(saleQuantity) / selectedProduct.bulkQuantity)} combos + {Number(saleQuantity) % selectedProduct.bulkQuantity} un.
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-zinc-400">Total</span>
                          <p className="text-lg font-black text-zinc-900">{formatCurrency(Number(saleTotalValue))}</p>
                        </div>
                      </div>
                    )}
                    
                    <Input label="Data" name="date" type="date" defaultValue={editingSaleId ? sales.find(s => s.id === editingSaleId)?.date : new Date().toISOString().split('T')[0]} required />
                    
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={!selectedProduct}>
                        {editingSaleId ? <><Edit2 size={18} /> Salvar Alterações</> : <><ShoppingCart size={18} /> Confirmar Venda</>}
                      </Button>
                      <Button variant="secondary" onClick={cancelEditing} className="px-3">
                        <X size={18} />
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-bold mb-4">Histórico de Vendas</h2>
                {sales.length === 0 ? (
                  <EmptyState message="Nenhuma venda registrada." />
                ) : (
                  sales.map(sale => (
                    <Card key={sale.id} className="p-5 group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="px-2 py-1 bg-zinc-100 rounded text-[10px] font-bold uppercase text-zinc-500">
                            {new Date(sale.date).toLocaleDateString('pt-BR')}
                          </div>
                          <h4 className="font-bold">{sale.productName}</h4>
                          {sale.customerId && (
                            <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
                              <Users size={10} />
                              {customers.find(c => c.id === sale.customerId)?.name || 'Cliente Removido'}
                            </div>
                          )}
                          {sale.paymentStatus === 'pending' && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-bold rounded uppercase">Fiado</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button variant="secondary" onClick={() => startEditingSale(sale)} className="p-1.5 px-1.5">
                            <Edit2 size={16} />
                          </Button>
                          <Button variant="danger" onClick={() => deleteItem('sales', sale.id)} className="p-1.5 px-1.5">
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        <SaleStat label="Qtd" value={sale.quantity} />
                        <SaleStat label="Faturamento" value={formatCurrency(sale.revenue)} />
                        <SaleStat label="Custo" value={formatCurrency(sale.totalCost)} />
                        <SaleStat label="Lucro" value={formatCurrency(sale.profit)} highlight={sale.profit >= 0} />
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'customers' && (
            <motion.div 
              key="customers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-1">
                <Card className="p-6 sticky top-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">{editingCustomerId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                    {editingCustomerId && (
                      <button onClick={() => setEditingCustomerId(null)} className="text-zinc-400 hover:text-zinc-600">
                        <X size={20} />
                      </button>
                    )}
                  </div>
                  <form onSubmit={addCustomer} className="space-y-4" autoComplete="off">
                    <Input 
                      label="Nome do Cliente" 
                      name="name" 
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      placeholder="Ex: João Silva" 
                      required 
                    />
                    <Input 
                      label="WhatsApp / Telefone" 
                      name="phone" 
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      placeholder="Ex: (11) 99999-9999" 
                    />
                    
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editingCustomerId ? <><Edit2 size={18} /> Salvar</> : <><UserPlus size={18} /> Cadastrar</>}
                      </Button>
                      {editingCustomerId && (
                        <Button variant="secondary" onClick={() => setEditingCustomerId(null)} className="px-3">
                          <X size={18} />
                        </Button>
                      )}
                    </div>
                  </form>
                </Card>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Meus Clientes</h2>
                  <div className="px-3 py-1 bg-amber-50 rounded-full border border-amber-100 flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-amber-600">Total Fiado</span>
                    <span className="text-sm font-black text-amber-900">
                      {formatCurrency(customers.reduce((acc, c) => acc + c.totalDebt, 0))}
                    </span>
                  </div>
                </div>
                {customers.length === 0 ? (
                  <EmptyState message="Nenhum cliente cadastrado." />
                ) : (
                  customers.map(customer => (
                    <Card key={customer.id} className="p-5 group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                            <UserIcon size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg">{customer.name}</h4>
                            <p className="text-xs text-zinc-500">{customer.phone || 'Sem telefone'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-zinc-400">Dívida Atual</span>
                          <p className={`text-lg font-black ${customer.totalDebt > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {formatCurrency(customer.totalDebt)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" onClick={() => startEditingCustomer(customer)}>
                            <Edit2 size={14} /> Editar
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => deleteItem('customers', customer.id)}>
                            <Trash2 size={14} /> Excluir
                          </Button>
                        </div>
                        {customer.totalDebt > 0 && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                            onClick={() => {
                              if (window.confirm(`Quitar dívida de ${formatCurrency(customer.totalDebt)} do cliente ${customer.name}?`)) {
                                setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, totalDebt: 0 } : c));
                              }
                            }}
                          >
                            <CheckCircle2 size={14} /> Quitar Dívida
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Análise de Desempenho</h2>
                <Button onClick={handleExportPDF} className="gap-2">
                  <FileText size={18} />
                  Exportar PDF
                  {!isPro && <Crown size={14} className="text-amber-400" />}
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <BarChart3 size={20} className="text-zinc-400" />
                    Vendas e Lucro (Últimos 7 dias)
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#27272a' : '#f4f4f5'} />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: theme === 'dark' ? '#71717a' : '#a1a1aa' }} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: theme === 'dark' ? '#71717a' : '#a1a1aa' }}
                          tickFormatter={(value) => `R$${value}`}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: theme === 'dark' ? '#18181b' : '#fff', 
                            borderColor: theme === 'dark' ? '#27272a' : '#e4e4e7',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }} 
                        />
                        <Area type="monotone" dataKey="revenue" name="Vendas" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                        <Area type="monotone" dataKey="profit" name="Lucro" stroke="#3b82f6" fillOpacity={0} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Package size={20} className="text-zinc-400" />
                    Top 5 Produtos (Faturamento)
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesByCategory} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme === 'dark' ? '#27272a' : '#f4f4f5'} />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false} 
                          width={100}
                          tick={{ fontSize: 10, fill: theme === 'dark' ? '#71717a' : '#a1a1aa' }}
                        />
                        <Tooltip 
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{ 
                            backgroundColor: theme === 'dark' ? '#18181b' : '#fff', 
                            borderColor: theme === 'dark' ? '#27272a' : '#e4e4e7',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }} 
                        />
                        <Bar dataKey="value" name="Total" radius={[0, 4, 4, 0]}>
                          {salesByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="p-6 lg:col-span-2">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <History size={20} className="text-zinc-400" />
                    Desempenho Semanal
                  </h3>
                  <div className="space-y-4">
                    {chartData.map((day, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <span className="text-sm font-bold text-zinc-500">{day.date}</span>
                        <div className="flex gap-8">
                          <div className="text-right">
                            <p className="text-[9px] uppercase font-bold text-zinc-400">Vendas</p>
                            <p className="text-sm font-bold">{formatCurrency(day.revenue)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] uppercase font-bold text-zinc-400">Lucro</p>
                            <p className={`text-sm font-bold ${day.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(day.profit)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <DollarSign size={20} className="text-emerald-500" />
                    Resumo do Mês
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Média Diária de Vendas</p>
                      <p className="text-3xl font-bold tracking-tight">
                        {formatCurrency(totals.revenue / (sales.length || 1))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Margem de Lucro Média</p>
                      <p className="text-3xl font-bold tracking-tight">
                        {((totals.netProfit / (totals.revenue || 1)) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="pt-6 border-t border-white/10 dark:border-black/10">
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                        Estes dados são baseados em todo o histórico registrado no aplicativo.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'expenses' && (
            <motion.div 
              key="expenses"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-1">
                <Card className="p-6 sticky top-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">{editingExpenseId ? 'Editar Despesa' : 'Nova Despesa'}</h2>
                    {editingExpenseId && (
                      <button onClick={cancelEditing} className="text-zinc-400 hover:text-zinc-600">
                        <X size={20} />
                      </button>
                    )}
                  </div>
                  <form onSubmit={addExpense} className="space-y-4" autoComplete="off">
                    <Input 
                      label="Descrição" 
                      name="description" 
                      value={newExpense.description}
                      onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                      placeholder="Ex: Aluguel, Luz" 
                      required 
                    />
                    <Input 
                      label="Valor (R$)" 
                      name="value" 
                      type="text" 
                      inputMode="decimal"
                      value={newExpense.value}
                      onChange={e => setNewExpense({...newExpense, value: e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.')})}
                      placeholder="Ex: 200.00" 
                      required 
                    />
                    <Input 
                      label="Data" 
                      name="date" 
                      type="date" 
                      value={newExpense.date}
                      onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                      required 
                    />
                    <Button type="submit" className="w-full">
                      {editingExpenseId ? <><Edit2 size={18} /> Salvar Alterações</> : <><Receipt size={18} /> Lançar Despesa</>}
                    </Button>
                  </form>
                </Card>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-bold mb-4">Registro de Despesas</h2>
                {expenses.length === 0 ? (
                  <EmptyState message="Nenhuma despesa lançada." />
                ) : (
                  expenses.map(expense => (
                    <Card key={expense.id} className="p-5 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                          <TrendingDown size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold">{expense.description}</h4>
                          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                            {new Date(expense.date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <p className="font-bold text-red-600">-{formatCurrency(expense.value)}</p>
                        <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button variant="secondary" onClick={() => startEditingExpense(expense)} className="p-1.5 px-1.5">
                            <Edit2 size={16} />
                          </Button>
                          <Button variant="danger" onClick={() => deleteItem('expenses', expense.id)} className="p-1.5 px-1.5">
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </motion.div>
          )}





          </AnimatePresence>

        {!isPro && <AdBanner />}
      </main>

      <InAppPurchaseModal 
        isOpen={showIapModal} 
        onClose={() => setShowIapModal(false)} 
        offering={offering}
        onPurchase={handleBuyClick} 
        onRestore={handleRestoreClick}
        isPurchasing={isPurchasing}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        user={user}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
        isPro={isPro}
      />

      <LegalModal 
        isOpen={showLegalModal} 
        onClose={() => setShowLegalModal(false)} 
        type={legalType} 
      />

      <AddTesterListModal 
        isOpen={isAddingTesterList}
        onClose={() => setIsAddingTesterList(false)}
        onSave={handleSaveTesterList}
        newTesterList={newTesterList}
        setNewTesterList={setNewTesterList}
      />

      {/* Footer */}
      <footer className="mt-20 pb-12 border-t border-zinc-100 dark:border-zinc-800 pt-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => { setLegalType('privacy'); setShowLegalModal(true); }}
              className="text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 uppercase tracking-widest"
            >
              Privacidade
            </button>
            <button 
              onClick={() => { setLegalType('terms'); setShowLegalModal(true); }}
              className="text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 uppercase tracking-widest"
            >
              Termos de Uso
            </button>
            <a 
              href="mailto:suporte@vendapro.com"
              className="text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 uppercase tracking-widest"
            >
              Suporte
            </a>
          </div>
          <p className="text-[10px] text-zinc-400 font-medium">
            © 2026 VendaPro. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      <InAppPurchaseModal 
        isOpen={showIapModal} 
        onClose={() => setShowIapModal(false)} 
        offering={offering} 
        onPurchase={handlePurchase} 
        onRestore={handleRestore} 
        isPurchasing={isPurchasing}
      />
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
        user={user}
      />

      {/* Restock Modal */}
      <AnimatePresence>
        {restockProductId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Package size={20} />
                  </div>
                  <h3 className="font-bold">Repor Estoque</h3>
                </div>
                <button onClick={() => setRestockProductId(null)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRestock} className="space-y-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 mb-4">
                  <p className="text-xs text-zinc-500 mb-1">Produto</p>
                  <p className="font-bold">{products.find(p => p.id === restockProductId)?.name}</p>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Estoque atual: <span className="font-bold text-zinc-700 dark:text-zinc-300">{products.find(p => p.id === restockProductId)?.currentStock} un.</span>
                  </p>
                </div>

                <Input 
                  label="Quantidade a Adicionar" 
                  type="number" 
                  value={restockQuantity}
                  onChange={e => setRestockQuantity(e.target.value)}
                  placeholder="Ex: 50"
                  autoFocus
                  required
                />

                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setRestockProductId(null)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                    Confirmar
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* Footer Branding */}
        <footer className="mt-12 pb-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-default">
            <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-black tracking-tighter">
              VENDA<span className="text-emerald-600 dark:text-emerald-400">PRO</span> STUDIO
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-600 font-medium uppercase tracking-widest">
            Tecnologia para pequenos negócios • 2026
          </p>
        </footer>
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}

// --- Helper Components ---

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all flex-1 sm:flex-none ${
        active 
          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-lg shadow-zinc-900/20 dark:shadow-white/10' 
          : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
      }`}
    >
      {icon}
      <span className={`text-[10px] sm:text-sm font-bold ${active ? 'block' : 'hidden sm:block'}`}>{label}</span>
    </button>
  );
}

function StatCard({ label, value, icon, highlight = false }: { label: string; value: number; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <Card 
      noStyles={highlight}
      className={`p-6 ${highlight 
        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-none' 
        : 'text-zinc-900 dark:text-zinc-100'}`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-bold uppercase tracking-widest ${highlight ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-500 dark:text-zinc-400'}`}>{label}</span>
        <div className={`p-2 rounded-lg ${highlight ? 'bg-white/10 dark:bg-black/10' : 'bg-zinc-50 dark:bg-zinc-800'}`}>
          {icon}
        </div>
      </div>
      <div className={`text-2xl font-bold tracking-tight ${highlight ? 'text-white dark:text-zinc-900' : 'text-zinc-900 dark:text-zinc-100'}`}>
        {formatCurrency(value)}
      </div>
    </Card>
  );
}

function SaleStat({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-zinc-100'}`}>{value}</p>
    </div>
  );
}

function ProgressBar({ label, value, color }: { label: string; value: number; color: string }) {
  const cappedValue = Math.min(Math.max(value, 0), 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
        <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
        <span className="text-zinc-900 dark:text-zinc-100">{isNaN(value) ? '0' : value.toFixed(1)}%</span>
      </div>
      <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${cappedValue}%` }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
      <AlertCircle size={40} className="mb-4 opacity-20" />
      <p className="font-medium">{message}</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

import { ADS_CONFIG } from './adsConfig';

function AdBanner() {
  useEffect(() => {
    if (!ADS_CONFIG.isTesting) {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error("Erro ao carregar AdSense:", e);
      }
    }
  }, []);

  return (
    <div className="mt-12 p-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 overflow-hidden relative group min-h-[140px]">
      <div className="absolute top-2 left-2 bg-zinc-200 dark:bg-zinc-800 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest text-zinc-500">Anúncio</div>
      
      {ADS_CONFIG.isTesting ? (
        <>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Anúncio de Teste do Google</p>
          <div className="w-full h-20 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-xl flex items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-700">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Banner de Teste Ativo</p>
          </div>
        </>
      ) : (
        <div className="w-full overflow-hidden">
          {/* Bloco de Anúncio Real */}
          <ins className="adsbygoogle"
               style={{ display: 'block' }}
               data-ad-client={ADS_CONFIG.publisherId}
               data-ad-slot={ADS_CONFIG.bannerAdUnitId.split('/')[1]}
               data-ad-format="auto"
               data-full-width-responsive="true"></ins>
        </div>
      )}
    </div>
  );
}

function LegalModal({ isOpen, onClose, type }: { isOpen: boolean; onClose: () => void; type: 'privacy' | 'terms' }) {
  if (!isOpen) return null;

  const content = {
    privacy: {
      title: "Política de Privacidade",
      text: `
        A sua privacidade é importante para nós. É política do VendaPro respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no aplicativo VendaPro.

        1. Coleta de Informações
        Coletamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento.

        2. Uso de Dados
        Os dados coletados (produtos, vendas, despesas) são armazenados de forma segura no Google Firebase e são de propriedade exclusiva do usuário. Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei.

        3. Segurança
        Protegemos os dados armazenados dentro de meios comercialmente aceitáveis para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.

        4. Cookies e Anúncios
        Utilizamos o Google AdMob para exibir anúncios. O Google pode usar cookies para veicular anúncios com base em suas visitas anteriores ao nosso app ou a outros sites.

        5. Consentimento
        O uso continuado de nosso aplicativo será considerado como aceitação de nossas práticas em torno de privacidade e informações pessoais.
      `
    },
    terms: {
      title: "Termos de Uso",
      text: `
        Ao acessar o aplicativo VendaPro, você concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis.

        1. Licença de Uso
        É concedida permissão para baixar temporariamente uma cópia do aplicativo para uso pessoal e comercial individual. Esta é a concessão de uma licença, não uma transferência de título.

        2. Isenção de Responsabilidade
        O VendaPro é uma ferramenta de auxílio à gestão. Não nos responsabilizamos por decisões financeiras tomadas com base nos dados do aplicativo ou por eventuais perdas de dados decorrentes de mau uso.

        3. Assinatura PRO
        A assinatura PRO remove anúncios e libera recursos extras. O pagamento via Pix é processado manualmente e pode levar até 24h para ser liberado após o envio do comprovante.

        4. Modificações
        O VendaPro pode revisar estes termos de serviço a qualquer momento, sem aviso prévio. Ao usar este aplicativo, você concorda em ficar vinculado à versão atual desses termos de serviço.
      `
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl max-h-[80vh] rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">{content[type].title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-8 overflow-y-auto text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed space-y-4 whitespace-pre-line">
          {content[type].text}
        </div>
        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <Button onClick={onClose}>Entendido</Button>
        </div>
      </div>
    </div>
  );
}



function AddTesterListModal({ 
  isOpen, 
  onClose, 
  onSave, 
  newTesterList, 
  setNewTesterList 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (e: React.FormEvent) => void;
  newTesterList: { name: string; emails: string; };
  setNewTesterList: React.Dispatch<React.SetStateAction<{ name: string; emails: string; }>>;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">Criar lista de e-mails</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSave} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nome da lista *</label>
            <Input 
              value={newTesterList.name}
              onChange={e => setNewTesterList(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Testadores Internos"
              maxLength={200}
              required
            />
            <p className="text-[10px] text-zinc-400 text-right">{newTesterList.name.length} / 200</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Adicionar endereços de e-mail *</label>
              <button 
                type="button"
                onClick={() => setNewTesterList(prev => ({ 
                  ...prev, 
                  emails: "daianesilvak9@gmail.com, kaelsilvak3@gmail.com, prozinetk2@gmail.com, daianecunha.k2@gmail.com, elieltonsilvak2@gmail.com, paulasilvadosantos261@gmail.com, kalyelsilvak2@gmail.com, silvaelielton761@gmail.com, vanessasilvak596@gmail.com, eduardocunhak88@gmail.com, ferreirawandinho2@gmail.com, didaspedro4@gmail.com" 
                }))}
                className="text-[10px] font-bold text-amber-600 hover:text-amber-700"
              >
                Carregar Exemplo
              </button>
            </div>
            <textarea 
              value={newTesterList.emails}
              onChange={e => setNewTesterList(prev => ({ ...prev, emails: e.target.value }))}
              placeholder="user@example.com, user@example.com"
              className="w-full h-32 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm resize-none"
              required
            />
            <p className="text-[10px] text-zinc-400">Separe os e-mails com uma vírgula ou nova linha para adicionar à lista.</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none">Criar Lista</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
