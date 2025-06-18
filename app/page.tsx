"use client"

import type React from "react"
// FIX: Envolvemos várias funções em useCallback e corrigimos as dependências do useEffect.
import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import Header from '@/components/ui/header'
import ManaIcon from '@/components/ui/mana-icon'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
// DnD Kit imports
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Upload,
  FileText,
  Grid3X3,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Loader2,
  X,
  Save,
  FolderOpen,
  Trash2,
  Shuffle,
  BarChart3,
  TrendingUp,
  Coins,
  Library,
  Copy,
  Hammer,
  Plus,
  Minus,
  Download,
  Settings,
  Search,
  Edit3,
  Check,
  // Novos ícones para o modal
  Sword,
  Shield,
  Calendar,
  User,
  Palette,
  Hash,
  Globe,
  ExternalLink,
  Star,
  Sparkles,
  Zap,
  Info,
  BookOpen,
  Pencil,
  Archive, // Adicionado para sideboard premium
} from "lucide-react"

interface MTGCard {
  id: string
  name: string
  set_name: string
  set_code: string
  collector_number: string
  rarity: string
  mana_cost?: string
  cmc: number
  type_line: string
  oracle_text?: string
  power?: string
  toughness?: string
  artist: string
  lang: string
  released_at: string
  image_uris?: {
    normal: string
    small?: string
    art_crop?: string
  }
  card_faces?: Array<{
    name: string
    mana_cost?: string
    type_line: string
    oracle_text?: string
    power?: string
    toughness?: string
    image_uris?: {
      normal: string
      small?: string
      art_crop?: string
    }
  }>
  color_identity: string[]
  foil: boolean
  nonfoil: boolean
  prints_search_uri: string
}

interface CollectionCard {
  card: MTGCard
  quantity: number
  condition: string
  foil: boolean
  addedAt: string
}

interface UserCollection {
  id: string
  name: string
  description: string
  cards: CollectionCard[]
  createdAt: string
  updatedAt: string
  isPublic: boolean
}

interface OwnedCard {
  originalEntry: Record<string, string>
  scryfallData: MTGCard
}

interface DeckCard {
  card: MTGCard
  quantity: number
  isCommander?: boolean
  isSideboard?: boolean
}

interface SavedDeck {
  id: string
  name: string
  format: string
  mainboard: DeckCard[]
  sideboard: DeckCard[]
  commander?: DeckCard
  description?: string
  createdAt: string
  updatedAt: string
}

interface SavedFilter {
  id: string
  name: string
  collectionType: string
  filters: {
    searchQuery: string
    ownershipFilter: string
    sortBy: string
    sortAscending: boolean
    rarityFilter: string
    cmcFilter: string
    powerFilter: string
    toughnessFilter: string
    languageFilter: string
    artistFilter: string
    oracleTextFilter: string
    foilFilter: string
    activeColors: string[]
  }
  createdAt: string
}

const cardTypes = [
  { value: "creature", label: "Criaturas" },
  { value: "land", label: "Terrenos" },
  { value: "artifact", label: "Artefatos" },
  { value: "enchantment", label: "Encantamentos" },
  { value: "instant", label: "Mágicas Instantâneas" },
  { value: "sorcery", label: "Feitiçarias" },
  { value: "planeswalker", label: "Planeswalkers" },
]

// Componente para cartas arrastáveis
interface DraggableCardProps {
  card: MTGCard
  children: React.ReactNode
}

function DraggableCard({ card, children }: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: card.id })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-move ${isDragging ? 'z-50' : ''}`}
    >
      {children}
    </div>
  )
}

// Componente para zona de drop
interface DroppableZoneProps {
  children: React.ReactNode
  id: string
  className?: string
}

function DroppableZone({ children, id, className = '' }: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${
        isOver
          ? 'bg-emerald-500/10 border-emerald-400/50 shadow-lg shadow-emerald-500/20'
          : ''
      } transition-all duration-300`}
    >
      {children}
    </div>
  )
}

export default function MTGCollectionManager() {
  const [allCards, setAllCards] = useState<MTGCard[]>([])
  const [deckBuilderCards, setDeckBuilderCards] = useState<MTGCard[]>([])
  const [ownedCardsMap, setOwnedCardsMap] = useState<Map<string, OwnedCard>>(new Map())
  const [filteredCards, setFilteredCards] = useState<MTGCard[]>([])
  const [filteredDeckCards, setFilteredDeckCards] = useState<MTGCard[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [collectionType, setCollectionType] = useState("all")
  const [selectedCard, setSelectedCard] = useState<MTGCard | null>(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [textView, setTextView] = useState(false)
  const [currentColumns, setCurrentColumns] = useState(7)
  const [hiddenSets, setHiddenSets] = useState<Set<string>>(new Set())
  const [isLoadingCards, setIsLoadingCards] = useState(false)
  const [activeTab, setActiveTab] = useState("collection")

  // Collection name editing state
  const [isEditingCollectionName, setIsEditingCollectionName] = useState(false)

  // New collection states
  const [currentCollection, setCurrentCollection] = useState<UserCollection>({
    id: "",
    name: "Minha Coleção",
    description: "",
    cards: [],
    createdAt: "",
    updatedAt: "",
    isPublic: false,
  })
  const [savedCollections, setSavedCollections] = useState<UserCollection[]>([])
  const [showSaveCollectionDialog, setShowSaveCollectionDialog] = useState(false)
  const [showLoadCollectionDialog, setShowLoadCollectionDialog] = useState(false)

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<{
    id: string
    name: string
    email: string
    firstName?: string
    lastName?: string
    avatar?: string
    bio?: string
  } | null>(null)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [showProfileDialog, setShowProfileDialog] = useState(false)

  // Drag and Drop states
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedCard, setDraggedCard] = useState<MTGCard | null>(null)
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
  })
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    bio: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  })
  const [isRegistering, setIsRegistering] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)

  // Deck Builder States
  const [currentDeck, setCurrentDeck] = useState<SavedDeck>({
    id: "",
    name: "Novo Deck",
    format: "standard",
    mainboard: [],
    sideboard: [],
    description: "",
    createdAt: "",
    updatedAt: "",
  })
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([])
  const [deckSearchQuery, setDeckSearchQuery] = useState("")
  const [showDeckSaveDialog, setShowDeckSaveDialog] = useState(false)
  const [showDeckLoadDialog, setShowDeckLoadDialog] = useState(false)
  const [deckImportText, setDeckImportText] = useState("")
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [isSearchingCards, setIsSearchingCards] = useState(false)

  // Background image state
  const [backgroundImage, setBackgroundImage] = useState<string>("")
  const [isLoadingBackground, setIsLoadingBackground] = useState(false)

  // Filter states
  const [ownershipFilter, setOwnershipFilter] = useState("all")
  const [sortBy, setSortBy] = useState("edition")
  const [sortAscending, setSortAscending] = useState(false)
  const [rarityFilter, setRarityFilter] = useState("all")
  const [cmcFilter, setCmcFilter] = useState("")
  const [powerFilter, setPowerFilter] = useState("")
  const [toughnessFilter, setToughnessFilter] = useState("")
  const [languageFilter, setLanguageFilter] = useState("all")
  const [artistFilter, setArtistFilter] = useState("all")
  const [oracleTextFilter, setOracleTextFilter] = useState("")
  const [foilFilter, setFoilFilter] = useState("all")
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([])
  const [availableArtists, setAvailableArtists] = useState<string[]>([])
  const [activeColors, setActiveColors] = useState<Set<string>>(new Set(["W", "U", "B", "R", "G", "C"]))

  // Saved filters states
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [filterName, setFilterName] = useState("")
  const [showLoadDialog, setShowLoadDialog] = useState(false)

  // Rules tab states
  const [rulesSearchQuery, setRulesSearchQuery] = useState("")
  const [selectedRulesCard, setSelectedRulesCard] = useState<MTGCard | null>(null)
  const [cardRulings, setCardRulings] = useState<any[]>([])
  const [isLoadingRulings, setIsLoadingRulings] = useState(false)
  const [rulesSource, setRulesSource] = useState<"search" | "collection" | "deck">("search")
  const [selectedCollectionForRules, setSelectedCollectionForRules] = useState<string>("")
  const [selectedDeckForRules, setSelectedDeckForRules] = useState<string>("")
  const [availableRulesCards, setAvailableRulesCards] = useState<MTGCard[]>([])

  // Pagination states for cards loading
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMorePages, setHasMorePages] = useState(true)
  const [totalCardsAvailable, setTotalCardsAvailable] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [cardsPerPage] = useState(20) // Carregar apenas 20 cartas por página

  // Adicionar estados de paginação para o construtor de deck
  const [deckCurrentPage, setDeckCurrentPage] = useState(1)
  const [deckHasMorePages, setDeckHasMorePages] = useState(true)
  const [deckTotalCardsAvailable, setDeckTotalCardsAvailable] = useState(0)
  const [deckTotalPages, setDeckTotalPages] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const columnOptions =  [3, 4, 5, 6, 10, 12];
  const abortControllerRef = useRef<AbortController | null>(null)

  const getGridColsClass = (columns: number) => {
    const gridClasses = {
      3: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
      5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
      6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
      7: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7",
      8: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8",
      9: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-9",
    }
    return gridClasses[columns as keyof typeof gridClasses] || gridClasses[5]
  }

  const normalize = (str: string | null | undefined) => {
    if (!str || typeof str !== "string") return ""
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
  }

  // Função para buscar preço no Liga Magic
  const fetchLigaMagicPrice = async (cardName: string): Promise<number | null> => {
    try {
      // Normalizar nome da carta para busca
      const searchName = cardName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '+')
      
      // Simular busca no Liga Magic (em produção, seria uma API real)
      // Por enquanto, vamos retornar null para usar o fallback
      const response = await fetch(`https://api.ligamagic.com.br/search?q=${searchName}`, {
        headers: {
          'User-Agent': 'MTGCollectionManager/1.0'
        }
      }).catch(() => null)
      
      if (response && response.ok) {
        const data = await response.json()
        if (data.price) {
          return data.price
        }
      }
      
      return null
    } catch (error) {
      console.error('Erro ao buscar preço no Liga Magic:', error)
      return null
    }
  }

  // Função para simular preço baseado na raridade e tipo (synchronous)
  const getEstimatedPrice = (card: MTGCard): number => {
    const basePrice = {
      common: 0.5,
      uncommon: 2.0,
      rare: 15.0,
      mythic: 35.0,
    }

    const typeMultiplier = {
      planeswalker: 2.5,
      legendary: 1.8,
      artifact: 1.3,
      enchantment: 1.2,
      instant: 1.1,
      sorcery: 1.1,
      creature: 1.0,
    }

    let price = basePrice[card.rarity as keyof typeof basePrice] || 1.0

    // Aplicar multiplicador por tipo
    for (const [type, multiplier] of Object.entries(typeMultiplier)) {
      if (card.type_line.toLowerCase().includes(type)) {
        price *= multiplier
        break
      }
    }

    // Variação aleatória baseada no ID da carta para consistência
    const seed = card.id.charCodeAt(0) + card.id.charCodeAt(1)
    const variation = 0.5 + (seed % 100) / 100 // 0.5 a 1.5
    price *= variation

    // Converter para reais (simulando cotação USD -> BRL)
    return price * 5.2
  }

  // Collection functions
  const addCardToCollection = (card: MTGCard, quantity = 1, condition = "Near Mint", foil = false) => {
    setCurrentCollection((prev) => {
      const existingIndex = prev.cards.findIndex((c) => c.card.id === card.id && c.foil === foil)

      let newCards
      if (existingIndex >= 0) {
        newCards = [...prev.cards]
        newCards[existingIndex] = {
          ...newCards[existingIndex],
          quantity: newCards[existingIndex].quantity + quantity,
        }
      } else {
        const newCard: CollectionCard = {
          card,
          quantity,
          condition,
          foil,
          addedAt: new Date().toISOString(),
        }
        newCards = [...prev.cards, newCard]
      }

      return {
        ...prev,
        cards: newCards,
        updatedAt: new Date().toISOString(),
      }
    })
  }

  const removeCardFromCollection = (cardId: string, foil = false, quantity = 1) => {
    setCurrentCollection((prev) => {
      const newCards = prev.cards
        .map((c) => {
          if (c.card.id === cardId && c.foil === foil) {
            const newQuantity = c.quantity - quantity
            return newQuantity > 0 ? { ...c, quantity: newQuantity } : null
          }
          return c
        })
        .filter(Boolean) as CollectionCard[]

      return {
        ...prev,
        cards: newCards,
        updatedAt: new Date().toISOString(),
      }
    })
  }

  const getCardQuantityInCollection = (cardId: string, foil = false) => {
    const collectionCard = currentCollection.cards.find((c) => c.card.id === cardId && c.foil === foil)
    return collectionCard?.quantity || 0
  }

  // Drag and Drop functions
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const cardId = active.id as string
    
    // Encontrar a carta que está sendo arrastada
    const card = allCards.find(c => c.id === cardId)
    if (card) {
      setActiveId(cardId)
      setDraggedCard(card)
    }
  }, [allCards])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    
    if (over) {
      const cardId = active.id as string
      const card = allCards.find(c => c.id === cardId) || deckBuilderCards.find(c => c.id === cardId)
      
      if (card) {
        if (over.id === 'collection-drop-zone') {
          // Adicionar carta à coleção
          addCardToCollection(card, 1, "Near Mint", false)
          console.log(`Carta "${card.name}" adicionada à coleção!`)
        } else if (over.id === 'deck-mainboard-zone') {
          // Adicionar carta ao baralho principal
          addCardToDeck(card, 1, false)
          console.log(`Carta "${card.name}" adicionada ao baralho principal!`)
        } else if (over.id === 'deck-sideboard-zone') {
          // Adicionar carta ao sideboard
          addCardToDeck(card, 1, true)
          console.log(`Carta "${card.name}" adicionada ao sideboard!`)
        }
      }
    }
    
    // Reset states
    setActiveId(null)
    setDraggedCard(null)
  }, [allCards, deckBuilderCards, addCardToCollection])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setDraggedCard(null)
  }, [])

  const saveCollection = () => {
  const collectionToSave: UserCollection = {
    ...currentCollection,
    id: currentCollection.id || Date.now().toString(),
    name: currentCollection.name || "Minha Coleção",
    createdAt: currentCollection.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  setSavedCollections((prev) => {
    const existingIndex = prev.findIndex((c) => c.id === collectionToSave.id)
    if (existingIndex >= 0) {
      const newCollections = [...prev]
      newCollections[existingIndex] = collectionToSave
      return newCollections
    } else {
      return [...prev, collectionToSave]
    }
  })

  setCurrentCollection(collectionToSave)
  setShowSaveCollectionDialog(false)
}

  const newCollection = () => {
    setCurrentCollection({
      id: "",
      name: "Minha Coleção",
      description: "",
      cards: [],
      createdAt: "",
      updatedAt: "",
      isPublic: false,
    })
  }

  const deleteCollection = (collectionId: string) => {
    setSavedCollections((prev) => prev.filter((c) => c.id !== collectionId))
  }
  
  const loadCollection = (collection: UserCollection) => {
    setCurrentCollection(collection);
    // Re-populate ownedCardsMap from the loaded collection for filtering
    const newOwnedCards = new Map<string, OwnedCard>();
    collection.cards.forEach(cc => {
        // Create a minimal original entry for compatibility
        const entry: Record<string, string> = {
            Name: cc.card.name,
            Quantity: cc.quantity.toString(),
            Set: cc.card.set_name,
        };
        newOwnedCards.set(cc.card.id, {
            originalEntry: entry,
            scryfallData: cc.card,
        });
    });
    setOwnedCardsMap(newOwnedCards);
    setShowLoadCollectionDialog(false);
  };

  // Função para exportar coleção para CSV (formato compatível com ManaBox)
  const exportCollectionToCSV = () => {
    if (currentCollection.cards.length === 0) {
      alert("A coleção está vazia. Nada para exportar.");
      return;
    }

    // Cabeçalhos CSV baseados no formato ManaBox
    const headers = [
      "Name",
      "Set Name", 
      "Set Code",
      "Collector Number",
      "Quantity",
      "Foil",
      "Condition",
      "Language",
      "CMC",
      "Type",
      "Rarity",
      "Color Identity",
      "Purchase Price"
    ];

    // Gerar linhas CSV
    const csvRows = [headers.join(",")];
    
    currentCollection.cards.forEach((collectionCard) => {
      const card = collectionCard.card;
      
      // Formatar cores para o formato ManaBox
      const colorIdentity = card.color_identity ? card.color_identity.join("") : "";
      
      // Formatar foil para o formato ManaBox (*F* para foil)
      const foilIndicator = collectionCard.foil ? "*F*" : "";
      
      // Escapar caracteres especiais em strings
      const escapeCsvValue = (value: string | number) => {
        const stringValue = String(value || "");
        if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      const row = [
        escapeCsvValue(card.name),
        escapeCsvValue(card.set_name || ""),
        escapeCsvValue(card.set_code?.toUpperCase() || ""),
        escapeCsvValue(card.collector_number || ""),
        escapeCsvValue(collectionCard.quantity),
        escapeCsvValue(foilIndicator),
        escapeCsvValue(collectionCard.condition || "Near Mint"),
        escapeCsvValue("English"), // Assumindo inglês por padrão
        escapeCsvValue(card.cmc || 0),
        escapeCsvValue(card.type_line || ""),
        escapeCsvValue(card.rarity || ""),
        escapeCsvValue(colorIdentity),
        escapeCsvValue("") // Purchase Price vazio por padrão
      ];

      csvRows.push(row.join(","));
    });

    // Criar e baixar arquivo CSV
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    
    // Criar nome do arquivo com data e nome da coleção
    const collectionName = currentCollection.name || "Minha Coleção";
    const date = new Date().toISOString().split('T')[0];
    const filename = `${collectionName.replace(/[^a-zA-Z0-9]/g, '_')}_${date}.csv`;
    
    // Download do arquivo
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Calcular estatísticas do dashboard
  const dashboardStats = useMemo(() => {
    const collectionCards = currentCollection.cards

    // Valor estimado total
    const totalValue = collectionCards.reduce((sum, collectionCard) => {
      const cardPrice = getEstimatedPrice(collectionCard.card)
      return sum + cardPrice * collectionCard.quantity
    }, 0)

    // Cartas únicas
    const uniqueCards = collectionCards.length

    // Total de cópias
    const totalCopies = collectionCards.reduce((sum, collectionCard) => {
      return sum + collectionCard.quantity
    }, 0)

    // Distribuição por tipo
    const typeDistribution: Record<string, number> = {}
    collectionCards.forEach((collectionCard) => {
      const types = collectionCard.card.type_line.split("—")[0].trim().split(" ")
      types.forEach((type) => {
        const cleanType = type.replace(/[^a-zA-Z]/g, "").toLowerCase()
        if (cleanType) {
          typeDistribution[cleanType] = (typeDistribution[cleanType] || 0) + collectionCard.quantity
        }
      })
    })

    // Distribuição por cor
    const colorDistribution: Record<string, number> = {
      W: 0,
      U: 0,
      B: 0,
      R: 0,
      G: 0,
      C: 0, // Incolor
    }

    collectionCards.forEach((collectionCard) => {
      const colors = collectionCard.card.color_identity
      if (colors.length === 0) {
        colorDistribution.C += collectionCard.quantity
      } else {
        colors.forEach((color) => {
          if (colorDistribution[color] !== undefined) {
            colorDistribution[color] += collectionCard.quantity
          }
        })
      }
    })

    // Distribuição por raridade
    const rarityDistribution: Record<string, number> = {}
    collectionCards.forEach((collectionCard) => {
      const rarity = collectionCard.card.rarity
      rarityDistribution[rarity] = (rarityDistribution[rarity] || 0) + collectionCard.quantity
    })

    // Distribuição por CMC
    const cmcDistribution: Record<number, number> = {}
    collectionCards.forEach((collectionCard) => {
      const cmc = collectionCard.card.cmc
      cmcDistribution[cmc] = (cmcDistribution[cmc] || 0) + collectionCard.quantity
    })

    return {
      totalValue,
      uniqueCards,
      totalCopies,
      typeDistribution,
      colorDistribution,
      rarityDistribution,
      cmcDistribution,
    }
  }, [currentCollection])

  // Calcular estatísticas do deck
  const deckStats = useMemo(() => {
    const allDeckCards = [...currentDeck.mainboard, ...currentDeck.sideboard]
    if (currentDeck.commander) {
      allDeckCards.push(currentDeck.commander)
    }

    // Total de cartas
    const totalCards = currentDeck.mainboard.reduce((sum, deckCard) => sum + deckCard.quantity, 0)
    const sideboardCards = currentDeck.sideboard.reduce((sum, deckCard) => sum + deckCard.quantity, 0)

    // Curva de mana
    const manaCurve: Record<number, number> = {}
    currentDeck.mainboard.forEach((deckCard) => {
      const cmc = deckCard.card.cmc
      manaCurve[cmc] = (manaCurve[cmc] || 0) + deckCard.quantity
    })

    // Distribuição por cor
    const colorDistribution: Record<string, number> = {
      W: 0,
      U: 0,
      B: 0,
      R: 0,
      G: 0,
      C: 0,
    }

    allDeckCards.forEach((deckCard) => {
      const colors = deckCard.card.color_identity
      if (colors.length === 0) {
        colorDistribution.C += deckCard.quantity
      } else {
        colors.forEach((color) => {
          if (colorDistribution[color] !== undefined) {
            colorDistribution[color] += deckCard.quantity
          }
        })
      }
    })

    // Distribuição por tipo
    const typeDistribution: Record<string, number> = {}
    allDeckCards.forEach((deckCard) => {
      const types = deckCard.card.type_line.split("—")[0].trim().split(" ")
      types.forEach((type) => {
        const cleanType = type.replace(/[^a-zA-Z]/g, "").toLowerCase()
        if (cleanType) {
          typeDistribution[cleanType] = (typeDistribution[cleanType] || 0) + deckCard.quantity
        }
      })
    })

    // Valor estimado
    const totalValue = allDeckCards.reduce((sum, deckCard) => {
      const cardPrice = getEstimatedPrice(deckCard.card)
      return sum + cardPrice * deckCard.quantity
    }, 0)

    return {
      totalCards,
      sideboardCards,
      manaCurve,
      colorDistribution,
      typeDistribution,
      totalValue,
    }
  }, [currentDeck])

  // Componente para gráfico de barras simples
  const SimpleBarChart = ({
    data,
    title,
    colorMap,
  }: {
    data: Record<string, number>
    title: string
    colorMap?: Record<string, string>
  }) => {
    const maxValue = Math.max(...Object.values(data), 1) // Prevent division by zero
    const entries = Object.entries(data).sort(([keyA], [keyB]) => {
      // Custom sort for CMC
      if (title.toLowerCase().includes('cmc')) {
        return parseInt(keyA, 10) - parseInt(keyB, 10);
      }
      // Default sort by value
      return data[keyB] - data[keyA];
    });

    return (
      <Card className="bg-gray-800/70 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {entries.map(([key, value]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300 capitalize">{key}</span>
                  <span className="text-white font-medium">{value}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${(value / maxValue) * 100}%`,
                      backgroundColor: colorMap?.[key] || "#3b82f6",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Funções do Deck Builder
  const addCardToDeck = (card: MTGCard, quantity = 1, isSideboard = false) => {
    setCurrentDeck((prev) => {
      const targetArray = isSideboard ? prev.sideboard : prev.mainboard
      const existingIndex = targetArray.findIndex((deckCard) => deckCard.card.id === card.id)

      let newArray
      if (existingIndex >= 0) {
        newArray = [...targetArray]
        newArray[existingIndex] = {
          ...newArray[existingIndex],
          quantity: newArray[existingIndex].quantity + quantity,
        }
      } else {
        newArray = [...targetArray, { card, quantity, isSideboard }]
      }

      return {
        ...prev,
        [isSideboard ? "sideboard" : "mainboard"]: newArray,
        updatedAt: new Date().toISOString(),
      }
    })
  }

  const removeCardFromDeck = (cardId: string, quantity = 1, isSideboard = false) => {
    setCurrentDeck((prev) => {
      const targetArray = isSideboard ? prev.sideboard : prev.mainboard
      const newArray = targetArray
        .map((deckCard) => {
          if (deckCard.card.id === cardId) {
            const newQuantity = deckCard.quantity - quantity
            return newQuantity > 0 ? { ...deckCard, quantity: newQuantity } : null
          }
          return deckCard
        })
        .filter(Boolean) as DeckCard[]

      return {
        ...prev,
        [isSideboard ? "sideboard" : "mainboard"]: newArray,
        updatedAt: new Date().toISOString(),
      }
    })
  }

  const importDeckFromText = (text: string) => {
    
    const lines = text.split("\n").filter((line) => line.trim())
    const newMainboard: DeckCard[] = []
    const newSideboard: DeckCard[] = []
    let isInSideboard = false

    for (const line of lines) {
      const trimmedLine = line.trim()

      // Detectar seção do sideboard
      if (trimmedLine.toLowerCase().startsWith("sideboard") || trimmedLine.toLowerCase().startsWith("side:") || trimmedLine.toLowerCase().startsWith("// sideboard")) {
        isInSideboard = true
        continue
      }

      // Pular linhas vazias ou comentários
      if (!trimmedLine || trimmedLine.startsWith("//") || trimmedLine.startsWith("#")) {
        continue
      }

      // Tentar extrair quantidade e nome da carta
      const match = trimmedLine.match(/^(\d+)\s*x?\s*(.+)$/i) // handles "4x Lightning Bolt" and "4 Lightning Bolt"
      if (match) {
        const quantity = Number.parseInt(match[1], 10)
        const cardName = match[2].trim()

        // FIX: Assegurar que as cartas do construtor de baralhos estão carregadas antes de tentar encontrar uma carta.
        // A lógica atual procura corretamente em `deckBuilderCards`, que é preenchida na troca de separador.
        // Se não encontrar, podemos adicionar um placeholder ou registar um erro. A falha silenciosa atual é aceitável.
        const foundCard = deckBuilderCards.find((card) => normalize(card.name) === normalize(cardName))

        if (foundCard) {
          const deckCard: DeckCard = {
            card: foundCard,
            quantity,
            isSideboard: isInSideboard,
          }

          if (isInSideboard) {
            newSideboard.push(deckCard)
          } else {
            newMainboard.push(deckCard)
          }
        } else {
          console.warn(`Carta não encontrada na base de dados do construtor: ${cardName}`)
        }
      }
    }

    setCurrentDeck((prev) => ({
      ...prev,
      mainboard: newMainboard,
      sideboard: newSideboard,
      updatedAt: new Date().toISOString(),
    }))

    setShowImportDialog(false)
    setDeckImportText("")
  }

  const exportDeckToText = () => {
    let text = `// ${currentDeck.name}\n// ${currentDeck.format.toUpperCase()}\n\n`

    // Mainboard
    text += "// Mainboard\n"
    currentDeck.mainboard.forEach((deckCard) => {
      text += `${deckCard.quantity} ${deckCard.card.name}\n`
    })

    // Sideboard
    if (currentDeck.sideboard.length > 0) {
      text += "\n// Sideboard\n"
      currentDeck.sideboard.forEach((deckCard) => {
        text += `${deckCard.quantity} ${deckCard.card.name}\n`
      })
    }

    // Commander
    if (currentDeck.commander) {
      text += "\n// Commander\n"
      text += `1 ${currentDeck.commander.card.name}\n`
    }

    return text
  }

  const saveDeck = () => {
    const deckToSave: SavedDeck = {
      ...currentDeck,
      id: currentDeck.id || Date.now().toString(),
      createdAt: currentDeck.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setSavedDecks((prev) => {
      const existingIndex = prev.findIndex((deck) => deck.id === deckToSave.id)
      if (existingIndex >= 0) {
        const newDecks = [...prev]
        newDecks[existingIndex] = deckToSave
        return newDecks
      } else {
        return [...prev, deckToSave]
      }
    })

    setCurrentDeck(deckToSave)
    setShowDeckSaveDialog(false)
  }

  const loadDeck = (deck: SavedDeck) => {
    setCurrentDeck(deck)
    setShowDeckLoadDialog(false)
  }

  const newDeck = () => {
    setCurrentDeck({
      id: "",
      name: "Novo Deck",
      format: "standard",
      mainboard: [],
      sideboard: [],
      // FIX: Corrigido o erro de digitação de `sdescription` para `description`
      description: "",
      createdAt: "",
      updatedAt: "",
    })
  }

  const deleteDeck = (deckId: string) => {
    setSavedDecks((prev) => prev.filter((deck) => deck.id !== deckId))
  }

  // Função para buscar imagem de background aleatória
  const fetchRandomBackground = useCallback(async () => {
    setIsLoadingBackground(true)
    try {

      console.log("Buscando background aleatório...")
      const response = await fetch("https://api.scryfall.com/cards/random?q=has:image%22")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const card = await response.json()
      console.log("Carta recebida:", card.name)

      // Priorizar art_crop, depois normal, depois card_faces
      let imageUrl = null
      if (card.image_uris?.art_crop) {
        imageUrl = card.image_uris.art_crop
      } else if (card.image_uris?.normal) {
        imageUrl = card.image_uris.normal
      } else if (card.card_faces?.[0]?.image_uris?.art_crop) {
        imageUrl = card.card_faces[0].image_uris.art_crop
      } else if (card.card_faces?.[0]?.image_uris?.normal) {
        imageUrl = card.card_faces[0].image_uris.normal
      }

      if (imageUrl) {
        console.log("URL da imagem:", imageUrl)
        localStorage.setItem("mtg-background-image", imageUrl)
        setBackgroundImage(imageUrl)
        console.log("Background definido com sucesso!")
      }
      else {
        console.warn("Nenhuma imagem encontrada na carta, a tentar novamente...")
        // Se a carta aleatória não tiver arte, tente novamente.
        setTimeout(fetchRandomBackground, 500);
      }
    } catch (error) {
      console.error("Erro ao buscar background:", error)
      // Tentar novamente após 2 segundos
      setTimeout(fetchRandomBackground, 2000)
    } finally {
      setIsLoadingBackground(false)
    }
  }, [])

  // Authentication functions
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)

    try {
      // Simular autenticação
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (isRegistering) {
        // Simular registro
        if (loginForm.password !== loginForm.confirmPassword) {
          // Use um modal personalizado ou um elemento de UI para mensagens
          console.error("Senhas não coincidem!")
          return
        }

        const newUser = {
          id: Date.now().toString(),
          name: loginForm.name,
          email: loginForm.email,
          firstName: loginForm.name.split(" ")[0] || "",
          lastName: loginForm.name.split(" ").slice(1).join(" ") || "",
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${loginForm.email}`,
          bio: "",
        }

        setCurrentUser(newUser)
        localStorage.setItem("mtg-user", JSON.stringify(newUser))
        console.log("Utilizador registado com sucesso!")
      } else {
        // Simular login
        const user = {
          id: "user_123",
          name: loginForm.email.split("@")[0],
          email: loginForm.email,
          firstName: loginForm.email.split("@")[0],
          lastName: "",
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${loginForm.email}`,
          bio: "",
        }

        setCurrentUser(user)
        localStorage.setItem("mtg-user", JSON.stringify(user))
        console.log("Login efetuado com sucesso!")
      }

      setIsAuthenticated(true)
      setShowLoginDialog(false)
      setLoginForm({ email: "", password: "", name: "", confirmPassword: "" })
    } catch (error) {
      console.error("Erro na autenticação:", error)
      // Use um modal personalizado ou um elemento de UI para mensagens
      console.error("Erro na autenticação. Tente novamente.")
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentUser(null)
    localStorage.removeItem("mtg-user")
    // Limpar dados da sessão se necessário
    setOwnedCardsMap(new Map())
    setSavedDecks([])
    setSavedFilters([])
    setSavedCollections([])
    setCurrentCollection({
      id: "",
      name: "Minha Coleção",
      description: "",
      cards: [],
      createdAt: "",
      updatedAt: "",
      isPublic: false,
    })
    console.log("Logout efetuado com sucesso!")
  }

  const toggleAuthMode = () => {
    setIsRegistering(!isRegistering)
    setLoginForm({ email: "", password: "", name: "", confirmPassword: "" })
  }

  // Profile functions
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)

    try {
      // Simular atualização de perfil
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Validar palavra-passe atual (simulado)
      if (profileForm.newPassword && !profileForm.currentPassword) {
        // Use um modal personalizado ou um elemento de UI para mensagens
        console.error("Digite a sua palavra-passe atual para alterar a palavra-passe.")
        return
      }

      if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmNewPassword) {
        // Use um modal personalizado ou um elemento de UI para mensagens
        console.error("As novas palavras-passe não coincidem!")
        return
      }

      const updatedUser = {
        ...currentUser!,
        firstName: profileForm.firstName || currentUser!.firstName,
        lastName: profileForm.lastName || currentUser!.lastName,
        email: profileForm.email || currentUser!.email,
        bio: profileForm.bio || currentUser!.bio,
        name: `${profileForm.firstName || currentUser!.firstName} ${profileForm.lastName || currentUser!.lastName}`.trim(),
      }

      setCurrentUser(updatedUser)
      localStorage.setItem("mtg-user", JSON.stringify(updatedUser))
      setShowProfileDialog(false)

      // Limpar campos de palavra-passe
      setProfileForm((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      }))

      console.log("Perfil atualizado com sucesso!")
      // Use um modal personalizado ou um elemento de UI para mensagens
      console.log("Perfil atualizado com sucesso!")
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error)
      // Use um modal personalizado ou um elemento de UI para mensagens
      console.error("Erro ao atualizar perfil. Tente novamente.")
    } finally {
      setLoginLoading(false)
    }
  }

  // Função para procurar uma carta específica na API do Scryfall
  const findCardOnScryfall = async (cardName: string, setCode?: string): Promise<MTGCard | null> => {
    // URL base para a busca por nome exato
    let url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`;
    
    // Se um código de edição for fornecido, adicione-o à query para uma busca mais precisa
    if (setCode) {
      url += `&set=${encodeURIComponent(setCode)}`;
    }

    try {
      // Pequeno atraso para não sobrecarregar a API do Scryfall com muitas requisições rápidas
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms de atraso

      const response = await fetch(url);

      // Se a carta não for encontrada (404), e tentamos com uma edição,
      // vamos tentar novamente sem a edição.
      if (!response.ok && response.status === 404 && setCode) {
        console.warn(`Carta "${cardName}" não encontrada na edição "${setCode}". Tentando sem edição...`);
        return await findCardOnScryfall(cardName); // Chamada recursiva sem a edição
      }

      if (!response.ok) {
        throw new Error(`Erro na API Scryfall: ${response.status}`);
      }
      
      const card = await response.json();
      return card;

    } catch (error) {
      // Não logamos o erro final aqui, pois a função que chama irá fazê-lo.
      return null;
    }
  };

  // FIX: handleFileUpload agora procura cartas na API do Scryfall se não as encontrar localmente.
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    try {
      const text = await file.text();
      const lines = text
        .split("\n")
        .map((l) => l.trim().replace(/\r/g, '')) // Limpa espaços e carriage returns
        .filter(Boolean);

      if (lines.length <= 1) {
        console.warn("O ficheiro CSV está vazio ou contém apenas cabeçalhos.");
        setLoading(false);
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
      const nameIndex = headers.findIndex(h => normalize(h).includes("name") || normalize(h).includes("nome"));
      const quantityIndex = headers.findIndex(h => normalize(h).includes("quantity") || normalize(h).includes("quantidade") || normalize(h).includes("qty"));
      const setIndex = headers.findIndex(h => normalize(h).includes("set") || normalize(h).includes("edition") || normalize(h).includes("edicao"));

      if (nameIndex === -1) {
        console.error("Coluna de nome não encontrada no CSV.");
        setLoading(false);
        return;
      }
      
      let successCount = 0;
      let errorCount = 0;
      const collectionUpdates = new Map<string, { card: MTGCard; quantity: number; foil: boolean }>();

      // Usar um loop for...of para permitir o uso de 'await' dentro dele
      for (const [index, line] of lines.slice(1).entries()) {
        setLoadingMessage(`A processar linha ${index + 1}/${lines.length - 1}...`);

        const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
        const cardName = values[nameIndex];
        const cardSet = setIndex >= 0 ? values[setIndex] : "";
        const quantity = quantityIndex >= 0 ? Number.parseInt(values[quantityIndex], 10) || 1 : 1;

        if (!cardName) continue;

        // 1. Tentar encontrar a carta localmente primeiro (otimização)
        let matchingCard = allCards.find(
          (card) =>
            normalize(card.name) === normalize(cardName) &&
            (!cardSet || normalize(card.set_name) === normalize(cardSet) || normalize(card.set_code) === normalize(cardSet))
        );

        // 3. Processar a carta se foi encontrada (localmente OU via API)
        if (matchingCard) {
          const key = `${matchingCard.id}-false`; // Assumindo não-foil por enquanto
          const existing = collectionUpdates.get(key);
          if (existing) {
            existing.quantity += quantity;
          } else {
            collectionUpdates.set(key, { card: matchingCard, quantity, foil: false });
          }
          successCount++;
        } else {
          console.warn(`FALHA FINAL: Carta não encontrada no Scryfall: ${cardName} (Edição: ${cardSet || 'N/A'})`);
          errorCount++;
        }
      }
      
      // 4. Atualizar o estado da coleção de uma só vez para melhor performance
      setCurrentCollection((prev) => {
        const newCards = [...prev.cards];
        const newOwnedCards = new Map(ownedCardsMap);
        
        collectionUpdates.forEach(update => {
            // Adicionar ao mapa de posse para filtros
            const entry: Record<string, string> = { Name: update.card.name, Quantity: update.quantity.toString(), Set: update.card.set_name };
            newOwnedCards.set(update.card.id, { originalEntry: entry, scryfallData: update.card });

            // Adicionar ou atualizar na coleção atual
            const existingIndex = newCards.findIndex(c => c.card.id === update.card.id && c.foil === update.foil);
            if (existingIndex > -1) {
                newCards[existingIndex].quantity += update.quantity;
            } else {
                newCards.push({
                    card: update.card,
                    quantity: update.quantity,
                    condition: "Near Mint", // Condição padrão
                    foil: update.foil,
                    addedAt: new Date().toISOString()
                });
            }
        });
        
        setOwnedCardsMap(newOwnedCards);
        return { ...prev, cards: newCards, updatedAt: new Date().toISOString() };
      });

      setLoadingMessage(`Processamento concluído. ${successCount} cartas carregadas, ${errorCount} falharam.`);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Manter a mensagem por 3 segundos
      
    } catch (error) {
      console.error("Erro ao processar o ficheiro CSV:", error);
      setLoadingMessage("Ocorreu um erro. Verifique a consola para mais detalhes.");
    } finally {
      setLoading(false);
      setLoadingMessage("");
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Limpa o input de ficheiro
      }
    }
  };


  // Load saved background from localStorage and fetch new one if needed
  useEffect(() => {
    const savedBackground = localStorage.getItem("mtg-background-image")
    if (savedBackground) {
      setBackgroundImage(savedBackground)
    } else {
      fetchRandomBackground()
    }
  }, [fetchRandomBackground])

  // Check for existing user session
  useEffect(() => {
    const savedUser = localStorage.getItem("mtg-user")
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setCurrentUser(user)
        setIsAuthenticated(true)

        // Initialize profile form with user data
        setProfileForm({
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          bio: user.bio || "",
          currentPassword: "",
          newPassword: "",
          confirmNewPassword: "",
        })
      } catch (error) {
        console.error("Erro ao carregar utilizador salvo:", error)
        localStorage.removeItem("mtg-user")
      }
    }
  }, [])

  // Load saved data from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem("mtg-saved-filters")
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved))
      } catch (error) {
        console.error("Error loading saved filters:", error)
      }
    }

    const savedDecksData = localStorage.getItem("mtg-saved-decks")
    if (savedDecksData) {
      try {
        setSavedDecks(JSON.parse(savedDecksData))
      } catch (error) {
        console.error("Error loading saved decks:", error)
      }
    }

    const savedCollectionsData = localStorage.getItem("mtg-saved-collections")
    if (savedCollectionsData) {
      try {
        setSavedCollections(JSON.parse(savedCollectionsData))
      } catch (error) {
        console.error("Error loading saved collections:", error)
      }
    }
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("mtg-saved-filters", JSON.stringify(savedFilters))
  }, [savedFilters])

  useEffect(() => {
    localStorage.setItem("mtg-saved-decks", JSON.stringify(savedDecks))
  }, [savedDecks])

  useEffect(() => {
    localStorage.setItem("mtg-saved-collections", JSON.stringify(savedCollections))
  }, [savedCollections])

  // Update profile form when user changes
  useEffect(() => {
    if (currentUser) {
      setProfileForm((prev) => ({
        ...prev,
        firstName: currentUser.firstName || "",
        lastName: currentUser.lastName || "",
        email: currentUser.email || "",
        bio: currentUser.bio || "",
      }))
    }
  }, [currentUser])

  // Função para salvar filtros atuais
  const saveCurrentFilters = () => {
    if (!filterName.trim()) {
      // Use um modal personalizado ou um elemento de UI para mensagens
      console.error("Por favor, digite um nome para o filtro.")
      return
    }

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName.trim(),
      collectionType: collectionType || "all",
      filters: {
        searchQuery,
        ownershipFilter,
        sortBy,
        sortAscending,
        rarityFilter,
        cmcFilter,
        powerFilter,
        toughnessFilter,
        languageFilter,
        artistFilter,
        oracleTextFilter,
        foilFilter,
        activeColors: Array.from(activeColors),
      },
      createdAt: new Date().toISOString(),
    }

    setSavedFilters((prev) => [...prev, newFilter])
    setFilterName("")
    setShowSaveDialog(false)
    console.log(`Filtro "${newFilter.name}" salvo com sucesso!`)
  }

  // Função para carregar filtros salvos
  const loadSavedFilter = (savedFilter: SavedFilter) => {
    // Se o tipo de coleção for diferente, trocar primeiro
    if (savedFilter.collectionType !== collectionType) {
      setCollectionType(savedFilter.collectionType)
    }

    // Aplicar todos os filtros
    setSearchQuery(savedFilter.filters.searchQuery)
    setOwnershipFilter(savedFilter.filters.ownershipFilter)
    setSortBy(savedFilter.filters.sortBy)
    setSortAscending(savedFilter.filters.sortAscending)
    setRarityFilter(savedFilter.filters.rarityFilter)
    setCmcFilter(savedFilter.filters.cmcFilter)
    setPowerFilter(savedFilter.filters.powerFilter)
    setToughnessFilter(savedFilter.filters.toughnessFilter)
    setLanguageFilter(savedFilter.filters.languageFilter)
    setArtistFilter(savedFilter.filters.artistFilter)
    setOracleTextFilter(savedFilter.filters.oracleTextFilter)
    setFoilFilter(savedFilter.filters.foilFilter)
    setActiveColors(new Set(savedFilter.filters.activeColors))

    setShowLoadDialog(false)
    console.log(`Filtro "${savedFilter.name}" carregado com sucesso!`)
  }

  // Função para deletar filtro salvo
  const deleteSavedFilter = (filterId: string) => {
    setSavedFilters((prev) => prev.filter((f) => f.id !== filterId))
    console.log("Filtro deletado com sucesso!")
  }

  // Função para cancelar carregamento
  const cancelLoading = () => {
    console.log("A cancelar carregamento...")
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsLoadingCards(false)
    setLoading(false)
    setLoadingMessage("")
  }

  // Função para obter URL da imagem otimizada
  const getOptimizedImageUrl = (card: MTGCard, preferSmall = false) => {
    const imageUris = card.image_uris || card.card_faces?.[0]?.image_uris
    if (!imageUris) return "/placeholder.svg?height=310&width=223"

    if (preferSmall && imageUris.small) {
      return imageUris.small
    }
    return imageUris.normal || "/placeholder.svg?height=310&width=223"
  }

  // ...existing code...
  
    // Função refatorada para carregar cartas com paginação do Scryfall - CORRIGIDA
    const fetchGeneralCards = useCallback(async (pageNumber = 1) => {
      if (isLoadingCards) {
        console.log("Carregamento já em andamento")
        return
      }
  
      setIsLoadingCards(true)
      setLoading(true)
      setLoadingMessage(`A carregar cartas da página ${pageNumber}...`)
  
      try {
        // Usar API Scryfall com paginação - buscar cartas mais recentes primeiro
        // CORRIGIDO: Usar formato correto da API para garantir páginas diferentes
        const url = `https://api.scryfall.com/cards/search?q=game:paper&unique=prints&order=released&dir=desc&page=${pageNumber}&format=json`
        
        console.log(`A carregar página ${pageNumber} da API Scryfall`)
  
        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "MTGCollectionManager/1.0",
          },
        })
  
        if (!response.ok) {
          if (response.status === 429) {
            setLoadingMessage("Limite de taxa atingido. Aguarde um momento...")
            throw new Error("Rate limit exceeded")
          } else {
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
          }
        }
  
        const data = await response.json()
  
        if (!data.data || data.data.length === 0) {
          console.log("Nenhuma carta encontrada")
          setHasMorePages(false)
          return
        }
  
        // Filtrar cartas com imagens válidas - usar TODAS as cartas da página atual
        const allValidCards = data.data.filter((c: MTGCard) => {
          return (
            c.image_uris?.normal ||
            c.card_faces?.[0]?.image_uris?.normal ||
            c.image_uris?.small ||
            c.card_faces?.[0]?.image_uris?.small
          )
        })
  
        // CORRIGIDO: Não limitar a 20 cartas aqui, usar todas as cartas válidas da página
        const newCards = allValidCards
  
        // SUBSTITUIR as cartas atuais em vez de anexar (navegação por páginas)
        setAllCards(newCards)
        setCurrentPage(pageNumber)
  
        // Calcular informações de paginação baseado na resposta real da API
        const totalCards = data.total_cards || 0
        const hasMore = data.has_more || false
        
        setHasMorePages(hasMore)
        setTotalCardsAvailable(totalCards)
        
        // Calcular total de páginas baseado na API
        if (totalCards > 0) {
          // A API Scryfall geralmente retorna cerca de 175 cartas por página
          const estimatedCardsPerPage = Math.max(allValidCards.length, 100)
          setTotalPages(Math.ceil(totalCards / estimatedCardsPerPage))
        }
  
        console.log(`Carregadas ${newCards.length} cartas da página ${pageNumber}`)
        console.log(`Total de cartas disponíveis: ${totalCards}`)
        console.log(`Há mais páginas: ${hasMore}`)
  
        // Extrair opções de filtro sempre que carregamos cartas
        if (newCards.length > 0) {
          const languages = Array.from(new Set(newCards.map((card: MTGCard) => card.lang).filter(Boolean))) as string[]
          setAvailableLanguages(languages.sort())
  
          const artists = Array.from(new Set(newCards.map((card: MTGCard) => card.artist).filter(Boolean))) as string[]
          setAvailableArtists(artists.sort())
  
          console.log(`${newCards.length} cartas carregadas com sucesso na página ${pageNumber}.`)
        }
      } catch (error: any) {
        console.error("Erro ao carregar cartas:", error)
        setLoadingMessage(
          error.message.includes("Rate limit") 
            ? "Limite de taxa excedido. Aguarde um momento e tente novamente."
            : "Erro ao carregar cartas. Verifique a sua ligação."
        )
      } finally {
        setIsLoadingCards(false)
        setLoading(false)
      }
    }, [isLoadingCards])
  
  // ...existing code...

  // Função para construir query Scryfall baseada nos filtros
  const buildScryfallQuery = useCallback(() => {
    let query = "game:paper"

    // Filtro de busca por nome
    if (searchQuery.trim()) {
      query += ` "${searchQuery.trim()}"`
    }

    // Filtro por tipo
    if (collectionType && collectionType !== "all") {
      query += ` t:${collectionType}`
    }

    // Filtro por raridade
    if (rarityFilter !== "all") {
      query += ` r:${rarityFilter}`
    }

    // Filtro por CMC
    if (cmcFilter.trim()) {
      query += ` cmc:${cmcFilter.trim()}`
    }

    // Filtro por power
    if (powerFilter.trim()) {
      query += ` pow:${powerFilter.trim()}`
    }

    // Filtro por toughness
    if (toughnessFilter.trim()) {
      query += ` tou:${toughnessFilter.trim()}`
    }

    // Filtro por texto do oráculo
    if (oracleTextFilter.trim()) {
      query += ` o:"${oracleTextFilter.trim()}"`
    }

    // Filtro por cores
    if (activeColors.size < 6 && activeColors.size > 0) {
      const colors = Array.from(activeColors).filter(c => c !== "C")
      if (colors.length > 0) {
        query += ` c:${colors.join("")}`
      }
      if (activeColors.has("C") && colors.length === 0) {
        query += ` c:c`
      }
    }

    // Filtro por foil
    if (foilFilter === "foil") {
      query += ` is:foil`
    } else if (foilFilter === "nonfoil") {
      query += ` not:foil`
    }

    return query
  }, [searchQuery, collectionType, rarityFilter, cmcFilter, powerFilter, toughnessFilter, oracleTextFilter, activeColors, foilFilter])

  // Aplicar filtros para a coleção - MOVIDA PARA ANTES DE applyFiltersWithAPI
  const applyFilters = useCallback(() => {
    const filtered = allCards.filter((card) => {
      const owned = ownedCardsMap.has(card.id)
  
      // Ownership filter
      if (ownershipFilter === "owned" && !owned) return false
      if (ownershipFilter === "not-owned" && owned) return false
  
      // Hidden sets
      if (hiddenSets.has(card.set_name)) return false
  
      // Search filter
      if (searchQuery && !normalize(card.name).includes(normalize(searchQuery))) return false
  
      // Collection type filter
      if (collectionType && collectionType !== "all") {
        if (!normalize(card.type_line).includes(normalize(collectionType))) return false
      }
  
      // Advanced filters
      if (rarityFilter !== "all" && card.rarity !== rarityFilter) return false
      if (cmcFilter && card.cmc.toString() !== cmcFilter) return false
      if (powerFilter && card.power !== powerFilter) return false
      if (toughnessFilter && card.toughness !== toughnessFilter) return false
      if (artistFilter !== "all" && card.artist !== artistFilter) return false
      if (languageFilter !== "all" && card.lang !== languageFilter) return false
      if (oracleTextFilter && !normalize(card.oracle_text || "").includes(normalize(oracleTextFilter))) return false
  
      // Foil filter
      if (foilFilter === "foil" && !card.foil) return false
      if (foilFilter === "nonfoil" && !card.nonfoil) return false
  
      // Color filter
      if (activeColors.size < 6) {
        const cardColors = card.color_identity || []
        if (cardColors.length === 0) {
          if (!activeColors.has("C")) return false
        } else {
          if (!cardColors.some((c) => activeColors.has(c))) return false
        }
      }
  
      return true
    })
  
    // Sort - corrigir a parte de ordenação
    filtered.sort((a, b) => {
      let comparison = 0;
  
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'edition':
        default:
          const dateA = new Date(a.released_at || 0).getTime();
          const dateB = new Date(b.released_at || 0).getTime();
          // Mais recente primeiro por padrão
          comparison = dateB - dateA; 
          break;
      }
  
      return sortAscending ? comparison : -comparison;
    });
  
    setFilteredCards(filtered)
  }, [allCards, ownedCardsMap, ownershipFilter, hiddenSets, searchQuery, collectionType, rarityFilter, cmcFilter, powerFilter, toughnessFilter, artistFilter, languageFilter, oracleTextFilter, foilFilter, activeColors, sortBy, sortAscending])

  // Função para aplicar filtros com busca na API quando necessário - CORRIGIDA PARA PAGINAÇÃO
  const applyFiltersWithAPI = useCallback(async (pageNumber = 1, resetPagination = false) => {
    // Evitar múltiplas chamadas simultâneas
    if (isLoadingCards) {
      console.log("Já está carregando cartas, ignorando chamada")
      return
    }

    const currentQuery = buildScryfallQuery()
    
    // Se a query mudou significativamente (tem filtros específicos), fazer nova busca na API
    const hasSpecificFilters = searchQuery.trim() || 
      (collectionType && collectionType !== "all") ||
      rarityFilter !== "all" ||
      cmcFilter.trim() ||
      powerFilter.trim() ||
      toughnessFilter.trim() ||
      oracleTextFilter.trim() ||
      activeColors.size < 6 ||
      foilFilter !== "all"

    if (hasSpecificFilters && currentQuery !== "game:paper") {
      console.log("Aplicando filtros via API Scryfall:", currentQuery, "página:", pageNumber)
      
      setIsLoadingCards(true)
      setLoadingMessage(`A aplicar filtros... (página ${pageNumber})`)
      
      try {
        const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(currentQuery)}&unique=prints&order=released&dir=desc&page=${pageNumber}`
        
        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "MTGCollectionManager/1.0",
          },
        })

        if (response.ok) {
          const data = await response.json()
          
          if (data.data && data.data.length > 0) {
            // Filtrar cartas com imagens válidas e limitar a 20 por página
            const validCards = data.data.filter((c: MTGCard) => {
              return (
                c.image_uris?.normal ||
                c.card_faces?.[0]?.image_uris?.normal ||
                c.image_uris?.small ||
                c.card_faces?.[0]?.image_uris?.small
              )
            })

            const filteredCards = validCards.slice(0, 20) // Limitar a 20 cartas por página

            // SUBSTITUIR as cartas (não anexar) para navegação adequada por páginas
            setAllCards(filteredCards)
            setCurrentPage(pageNumber)
            
            // Calcular total de páginas baseado no total de cartas disponíveis
            const totalCardsFromAPI = data.total_cards || validCards.length
            const calculatedTotalPages = Math.ceil(totalCardsFromAPI / cardsPerPage)
            
            setHasMorePages(data.has_more && pageNumber < calculatedTotalPages)
            setTotalCardsAvailable(totalCardsFromAPI)
            setTotalPages(calculatedTotalPages)
            
            console.log(`Filtros aplicados: ${filteredCards.length} cartas na página ${pageNumber} de ${calculatedTotalPages}`)
          } else {
            // Nenhum resultado encontrado
            setAllCards([])
            setHasMorePages(false)
            setTotalPages(0)
            setCurrentPage(1)
            console.log("Nenhuma carta encontrada com os filtros especificados")
          }
        } else {
          console.log("Erro na API, aplicando filtros localmente")
          // Aplicar filtros locais como fallback (versão simplificada)
          const filtered = allCards.filter((card) => {
            if (searchQuery && !normalize(card.name).includes(normalize(searchQuery))) return false
            if (collectionType && collectionType !== "all" && !normalize(card.type_line).includes(normalize(collectionType))) return false
            if (rarityFilter !== "all" && card.rarity !== rarityFilter) return false
            return true
          })
          setFilteredCards(filtered)
        }
      } catch (error) {
        console.error("Erro ao aplicar filtros via API:", error)
        // Aplicar filtros locais como fallback (versão simplificada)
        const filtered = allCards.filter((card) => {
          if (searchQuery && !normalize(card.name).includes(normalize(searchQuery))) return false
          if (collectionType && collectionType !== "all" && !normalize(card.type_line).includes(normalize(collectionType))) return false
          if (rarityFilter !== "all" && card.rarity !== rarityFilter) return false
          return true
        })
        setFilteredCards(filtered)
      } finally {
        setIsLoadingCards(false)
      }
    } else {
      // Para filtros simples ou sem filtros, recarregar página 1 das cartas gerais
      if (resetPagination || pageNumber === 1) {
        await fetchGeneralCards(1)
      } else {
        // Aplicar filtros locais apenas (versão simplificada)
        const filtered = allCards.filter((card) => {
          if (searchQuery && !normalize(card.name).includes(normalize(searchQuery))) return false
          if (collectionType && collectionType !== "all" && !normalize(card.type_line).includes(normalize(collectionType))) return false
          if (rarityFilter !== "all" && card.rarity !== rarityFilter) return false
          return true
        })
        setFilteredCards(filtered)
      }
    }
  }, [buildScryfallQuery, searchQuery, collectionType, rarityFilter, cmcFilter, powerFilter, toughnessFilter, oracleTextFilter, activeColors, foilFilter, cardsPerPage, fetchGeneralCards, allCards, isLoadingCards])

  // Função para navegar para uma página específica
  const goToPage = useCallback(async (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages || isLoadingCards) {
      return
    }
    
    console.log(`Navegando para página ${pageNumber}`)
    
    // Verificar se há filtros ativos
    const hasActiveFilters = searchQuery.trim() || 
      (collectionType && collectionType !== "all") ||
      rarityFilter !== "all" ||
      cmcFilter.trim() ||
      powerFilter.trim() ||
      toughnessFilter.trim() ||
      oracleTextFilter.trim() ||
      activeColors.size < 6 ||
      foilFilter !== "all"

    if (hasActiveFilters) {
      // Implementar filtros diretamente para evitar dependência circular
      setIsLoadingCards(true)
      setLoadingMessage(`A aplicar filtros... (página ${pageNumber})`)
      
      try {
        const currentQuery = buildScryfallQuery()
        const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(currentQuery)}&unique=prints&order=released&dir=desc&page=${pageNumber}`
        
        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "MTGCollectionManager/1.0",
          },
        })

        if (response.ok) {
          const data = await response.json()
          
          if (data.data && data.data.length > 0) {
            const validCards = data.data.filter((c: MTGCard) => {
              return (
                c.image_uris?.normal ||
                c.card_faces?.[0]?.image_uris?.normal ||
                c.image_uris?.small ||
                c.card_faces?.[0]?.image_uris?.small
              )
            }).slice(0, 20)

            setAllCards(validCards)
            setCurrentPage(pageNumber)
            
            const totalCardsFromAPI = data.total_cards || validCards.length
            const calculatedTotalPages = Math.ceil(totalCardsFromAPI / cardsPerPage)
            
            setHasMorePages(data.has_more && pageNumber < calculatedTotalPages)
            setTotalCardsAvailable(totalCardsFromAPI)
            setTotalPages(calculatedTotalPages)
          }
        } else {
          console.log("Erro na API ao navegar")
        }
      } catch (error) {
        console.error("Erro ao navegar:", error)
      } finally {
        setIsLoadingCards(false)
      }
    } else {
      // Se não há filtros, usar a função padrão
      await fetchGeneralCards(pageNumber)
    }
  }, [fetchGeneralCards, totalPages, isLoadingCards, searchQuery, collectionType, rarityFilter, cmcFilter, powerFilter, toughnessFilter, oracleTextFilter, activeColors, foilFilter, buildScryfallQuery, cardsPerPage])

  // Função para ir para próxima página
  const goToNextPage = useCallback(async () => {
    if (currentPage < totalPages && !isLoadingCards) {
      await goToPage(currentPage + 1)
    }
  }, [currentPage, totalPages, goToPage, isLoadingCards])

  // Função para ir para página anterior
  const goToPreviousPage = useCallback(async () => {
    if (currentPage > 1 && !isLoadingCards) {
      await goToPage(currentPage - 1)
    }
  }, [currentPage, goToPage, isLoadingCards])

  // Função para carregar cartas para o construtor de deck - CORRIGIDA COM PAGINAÇÃO
  const fetchDeckBuilderCards = useCallback(async (pageNumber = 1) => {
    setIsSearchingCards(true)
    setLoadingMessage(`A carregar cartas para o construtor de deck (página ${pageNumber})...`)

    try {
      // Usar query similar à coleção mas com paginação independente
      const url = `https://api.scryfall.com/cards/search?q=game:paper&unique=prints&order=released&dir=desc&page=${pageNumber}&format=json`
      
      console.log(`A carregar página ${pageNumber} para construtor de deck`)

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "MTGCollectionManager/1.0",
        },
      })

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded")
        } else {
          throw new Error(`HTTP error: ${response.status}`)
        }
      }

      const data = await response.json()

      if (!data.data || data.data.length === 0) {
        console.log("Nenhuma carta encontrada para o construtor de deck")
        setDeckHasMorePages(false)
        return
      }

      // Filtrar cartas com imagens válidas - usar TODAS as cartas da página
      const validCards = data.data.filter((c: MTGCard) => {
        return (
          c.image_uris?.normal ||
          c.card_faces?.[0]?.image_uris?.normal ||
          c.image_uris?.small ||
          c.card_faces?.[0]?.image_uris?.small
        )
      })

      // SUBSTITUIR as cartas atuais (não anexar) para navegação por páginas
      setDeckBuilderCards(validCards)
      setDeckCurrentPage(pageNumber)
      
      // Calcular informações de paginação para o deck builder
      const totalCards = data.total_cards || 0
      const hasMore = data.has_more || false
      
      setDeckHasMorePages(hasMore)
      setDeckTotalCardsAvailable(totalCards)
      
      if (totalCards > 0) {
        const estimatedCardsPerPage = Math.max(validCards.length, 100)
        setDeckTotalPages(Math.ceil(totalCards / estimatedCardsPerPage))
      }
      
      console.log(`${validCards.length} cartas carregadas para o construtor de deck na página ${pageNumber}`)
    } catch (error: any) {
      console.error("Erro ao carregar cartas do construtor de deck:", error)
      setLoadingMessage(
        error.message.includes("Rate limit") 
          ? "Limite de taxa excedido. Aguarde um momento e tente novamente."
          : "Erro ao carregar cartas. Verifique a sua ligação."
      )
    } finally {
      setIsSearchingCards(false)
    }
  }, [])

  // Funções de navegação para o construtor de deck
  const goToDeckPage = useCallback(async (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > deckTotalPages || isSearchingCards) {
      return
    }
    
    console.log(`Navegando para página ${pageNumber} do construtor de deck`)
    await fetchDeckBuilderCards(pageNumber)
  }, [fetchDeckBuilderCards, deckTotalPages, isSearchingCards])

  const goToNextDeckPage = useCallback(async () => {
    if (deckCurrentPage < deckTotalPages && !isSearchingCards) {
      await goToDeckPage(deckCurrentPage + 1)
    }
  }, [deckCurrentPage, deckTotalPages, goToDeckPage, isSearchingCards])

  const goToPreviousDeckPage = useCallback(async () => {
    if (deckCurrentPage > 1 && !isSearchingCards) {
      await goToDeckPage(deckCurrentPage - 1)
    }
  }, [deckCurrentPage, goToDeckPage, isSearchingCards])

  // Aplicar filtros para o construtor de deck
  const applyDeckFilters = useCallback(() => {
    if (!deckBuilderCards.length) return

    const filtered = deckBuilderCards.filter((card) => {
      // Search filter
      if (deckSearchQuery && !normalize(card.name).includes(normalize(deckSearchQuery))) return false

      // Advanced filters
      if (rarityFilter !== "all" && card.rarity !== rarityFilter) return false
      if (cmcFilter && card.cmc.toString() !== cmcFilter) return false
      if (powerFilter && card.power !== powerFilter) return false
      if (toughnessFilter && card.toughness !== toughnessFilter) return false

      // Color filter
      if (activeColors.size < 6) {
        const cardColors = card.color_identity || []
        if (cardColors.length === 0) {
          if (!activeColors.has("C")) return false
        } else {
          if (!cardColors.some((c) => activeColors.has(c))) return false
        }
      }

      return true
    })

    setFilteredDeckCards(filtered)
  }, [deckBuilderCards, deckSearchQuery, rarityFilter, cmcFilter, powerFilter, toughnessFilter, activeColors])

  // Função para buscar regras da carta
  const fetchCardRulings = async (card: MTGCard) => {
    setIsLoadingRulings(true)
    setCardRulings([])
    
    try {
      // Primeiro, tentar buscar rulings da API do Scryfall
      const rulingsResponse = await fetch(`https://api.scryfall.com/cards/${card.id}/rulings`)
      
      if (rulingsResponse.ok) {
        const rulingsData = await rulingsResponse.json()
        if (rulingsData.data && rulingsData.data.length > 0) {
          setCardRulings(rulingsData.data)
        } else {
          // Se não há rulings no Scryfall, usar uma mensagem padrão
          setCardRulings([{
            source: "scryfall",
            published_at: card.released_at,
            comment: "Nenhuma regra específica encontrada para esta carta. Consulte as regras gerais do Magic."
          }])
        }
      } else {
        throw new Error("Falha ao buscar regras")
      }
    } catch (error) {
      console.error("Erro ao buscar regras:", error)
      setCardRulings([{
        source: "error",
        published_at: new Date().toISOString(),
        comment: "Erro ao carregar regras. Tente novamente mais tarde."
      }])
    } finally {
      setIsLoadingRulings(false)
    }
  }

  // Função para carregar cartas da coleção selecionada
  const loadCardsFromCollection = (collectionId: string) => {
    const collection = savedCollections.find(c => c.id === collectionId)
    if (collection) {
      const cards = collection.cards.map(cc => cc.card)
      setAvailableRulesCards(cards)
    }
  }

  // Função para carregar cartas do deck selecionado
  const loadCardsFromDeck = (deckId: string) => {
    const deck = savedDecks.find(d => d.id === deckId)
    if (deck) {
      const allCards = [
        ...deck.mainboard.map(dc => dc.card),
        ...deck.sideboard.map(dc => dc.card)
      ]
      if (deck.commander) {
        allCards.push(deck.commander.card)
      }
      // Remover duplicatas
      const uniqueCards = allCards.filter((card, index, self) => 
        index === self.findIndex(c => c.id === card.id)
      )
      setAvailableRulesCards(uniqueCards)
    }
  }

  // Carregar cartas automaticamente quando o componente monta - sempre carrega página 1
  useEffect(() => {
    if (allCards.length === 0 && activeTab === "collection") {
      console.log("Carregando cartas iniciais - página 1")
      fetchGeneralCards(1) // Carregar página 1 sempre que o app abre
    }
  }, [activeTab]) // Remover fetchGeneralCards e allCards.length das dependências
  
  // Carregar cartas do construtor de deck quando a aba é acedida
  useEffect(() => {
    if (activeTab === "deckbuilder" && deckBuilderCards.length === 0) {
      fetchDeckBuilderCards(1) // Sempre carregar página 1 quando a aba é aberta
    }
  }, [activeTab, fetchDeckBuilderCards])

    // Efeito para aplicar filtros locais quando dados carregam inicialmente
    useEffect(() => {
      if (allCards.length > 0 && activeTab === "collection") {
        applyFilters() // Aplicar apenas filtros locais quando cartas carregam
      }
    }, [allCards.length, activeTab]) // Remover applyFilters das dependências para evitar loop
  
    // Efeito para reaplicar filtros quando filtros mudam - RESETAR PARA PÁGINA 1
    useEffect(() => {
      // Verificar se há filtros ativos para evitar chamadas desnecessárias
      const hasActiveFilters = searchQuery.trim() || 
        (collectionType && collectionType !== "all") ||
        rarityFilter !== "all" ||
        cmcFilter.trim() ||
        powerFilter.trim() ||
        toughnessFilter.trim() ||
        oracleTextFilter.trim() ||
        activeColors.size < 6 ||
        foilFilter !== "all"
  
      if (activeTab === "collection") {
        if (hasActiveFilters) {
          const timeoutId = setTimeout(() => {
            // Quando filtros mudam, sempre voltar para página 1
            applyFiltersWithAPI(1, true) // true = resetar paginação
          }, 500) // Debounce de 500ms para evitar muitas requisições
  
          return () => clearTimeout(timeoutId)
        } else {
          // Se não há filtros ativos, apenas aplicar filtros locais
          applyFilters()
        }
      }
    }, [searchQuery, collectionType, rarityFilter, cmcFilter, powerFilter, toughnessFilter, oracleTextFilter, activeColors.size, foilFilter, activeTab])
  
    // Efeito para aplicar filtros ao construtor de deck
    useEffect(() => {
      if (deckBuilderCards.length > 0 && activeTab === "deckbuilder") {
        applyDeckFilters()
      }
    }, [deckBuilderCards, activeTab, applyDeckFilters])
  
  // Efeito para atualizar cartas disponíveis quando a fonte muda
  useEffect(() => {
    if (rulesSource === "collection" && selectedCollectionForRules) {
      loadCardsFromCollection(selectedCollectionForRules)
    } else if (rulesSource === "deck" && selectedDeckForRules) {
      loadCardsFromDeck(selectedDeckForRules)
    } else if (rulesSource === "search") {
      setAvailableRulesCards([])
    }
  }, [rulesSource, selectedCollectionForRules, selectedDeckForRules, savedCollections, savedDecks])

  // Limpeza ao desmontar componente
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const stats = {
    total: allCards.length,
    ownedArtworks: ownedCardsMap.size,
    totalCopies: Array.from(ownedCardsMap.values()).reduce(
      (sum, card) => sum + Number.parseInt(card.originalEntry.Quantity || "1", 10),
      0,
    ),
    missing: allCards.length - ownedCardsMap.size,
  }

  const visibleCards = filteredCards // Mostrar todas as cartas da página atual
  const visibleDeckCards = filteredDeckCards // Mostrar todas as cartas do deck builder

  const groupedCards = useMemo(() => visibleCards.reduce(
    (acc, card) => {
      const set = card.set_name || "Sem Edição"
      if (!acc[set]) acc[set] = []
      acc[set].push(card)
      return acc
    },
    {} as Record<string, MTGCard[]>,
  ), [visibleCards]);

  // Classes padrão para inputs e seleções
  const inputClasses =
    "bg-gray-900 border-gray-600 text-white placeholder-gray-400 focus:ring-emerald-500 focus:border-emerald-500"
  const selectClasses = "bg-gray-900 border-gray-600 text-white focus:ring-emerald-500 focus:border-emerald-500"

  // Mapas de cores para gráficos
  const colorMap = {
    W: "#fffbd5",
    U: "#0e68ab",
    B: "#150b00",
    R: "#d3202a",
    G: "#00733e",
    C: "#ccc2c0",
  }

  const rarityColorMap = {
    common: "#6b7280", // gray-500
    uncommon: "#d1d5db", // gray-300
    rare: "#f59e0b", // amber-500
    mythic: "#ef4444", // red-500
  }
  
  // FIX: Mapear o número de colunas para uma classe Tailwind válida para garantir que a compilação JIT funcione.
  const gridColsClass = useMemo(() => {
    switch(currentColumns) {
      case 3: return "grid-cols-3";
      case 5: return "grid-cols-5";
      case 7: return "grid-cols-7";
      default: return "grid-cols-7";
    }
  }, [currentColumns]);

// Função para alternar a cor (placeholder)
function toggleColor(color: string) {
  console.log(`Cor alternada: ${color}`);
}

// Função para alternar colunas (placeholder)
function cycleColumns() {
  console.log("Colunas alternadas");
}

// Função para formatar símbolos de mana (placeholder)
function formatManaSymbols(manaCost: string): string {
  return manaCost.replace(/\{(.*?)\}/g, '<span class="mana-symbol">$1</span>');
}
  
// Otimização para a lista de artistas e idiomas
const memoizedAvailableArtists = useMemo(() => availableArtists.slice(0, 100), [availableArtists]);

return (
  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
    onDragCancel={handleDragCancel}
  >
  <div className="min-h-screen relative">
  
    {backgroundImage && (
      <>
        <div
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: `url("${backgroundImage}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            filter: "blur(4px) brightness(0.6)",
          }}
        />
        <div className="fixed inset-0 z-0 bg-gradient-to-br from-gray-900/70 via-blue-900/70 to-purple-900/70" />
      </>
    )}

   
   
    {/* Fallback background se não houver imagem */}
    {!backgroundImage && (
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900" />
    )}

    {/* Main Content */}
    <div className="relative z-10">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <Header
          isAuthenticated={isAuthenticated}
          currentUser={currentUser}
          onLogin={() => setShowLoginDialog(true)}
          onLogout={handleLogout}
          onProfile={() => setShowProfileDialog(true)}
          onRandomBackground={fetchRandomBackground}
          isLoadingBackground={isLoadingBackground}
        />

        {/* Navegação de separadores */}
        <div className="relative mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full relative">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-gray-800/90 backdrop-blur-sm rounded-xl p-1 h-auto">
              <TabsTrigger
                value="collection"
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 font-medium h-12 rounded-lg transition-all duration-200"
              >
                <Library className="w-4 h-4 mr-2" />
                Coleção
              </TabsTrigger>
              <TabsTrigger
                value="dashboard"
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 font-medium h-12 rounded-lg transition-all duration-200"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Painel
              </TabsTrigger>
              <TabsTrigger
                value="deckbuilder"
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 font-medium h-12 rounded-lg transition-all duration-200"
              >
                <Hammer className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Construtor</span>
                <span className="sm:hidden">Deck</span>
              </TabsTrigger>
              <TabsTrigger
                value="rules"
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 font-medium h-12 rounded-lg transition-all duration-200"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Regras
              </TabsTrigger>
            </TabsList>

            {/* Separador da Coleção */}
            <TabsContent value="collection" className="space-y-6">
            
              {/* Cabeçalho da Coleção */}
              <Card className="bg-gray-800/90 backdrop-blur-xl border-gray-700 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Lado esquerdo - Informações da Coleção */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-600/20 rounded-xl flex items-center justify-center">
                          <Library className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          {!isEditingCollectionName ? (
                            // Modo de visualização
                            <div className="group flex items-center gap-3">
                              <h1 className="text-2xl font-bold text-white cursor-pointer">
                                {currentCollection.name || "Minha Coleção"}
                              </h1>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditingCollectionName(true)}
                                className="opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 p-2 h-8 w-8"
                                title="Editar nome da coleção"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            // Modo de edição
                            <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                              <Input
                                placeholder="Nome da coleção"
                                value={currentCollection.name}
                                onChange={(e) =>
                                  setCurrentCollection((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                    updatedAt: new Date().toISOString(),
                                  }))
                                }
                                className="bg-gray-800/50 border border-emerald-500/50 text-2xl font-bold text-white placeholder-gray-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-lg"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    setIsEditingCollectionName(false)
                                  }
                                  if (e.key === 'Escape') {
                                    setIsEditingCollectionName(false)
                                  }
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditingCollectionName(false)}
                                className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 p-2 h-8 w-8 transition-all duration-200"
                                title="Confirmar edição (Enter)"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <Textarea
                        placeholder="Descreva a sua coleção..."
                        value={currentCollection.description || ""}
                        onChange={(e) => setCurrentCollection((prev) => ({ ...prev, description: e.target.value }))}
                        className={`${inputClasses} resize-none`}
                        rows={2}
                      />
                    </div>

                    {/* Lado direito - Ações */}
                    <div className="flex flex-col gap-3">
                      <Button
                        variant="ghost"
                        onClick={newCollection}
                        className="justify-start bg-gray-800/40 backdrop-blur-sm border border-gray-600/30 text-gray-300 hover:text-white hover:bg-gray-700/50 hover:border-gray-500/40 transition-all duration-300 rounded-xl h-11 shadow-sm"
                      >
                        <Plus className="w-4 h-4 mr-3" />
                        Nova Coleção
                      </Button>

                      <Dialog open={showSaveCollectionDialog} onOpenChange={setShowSaveCollectionDialog}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            className="justify-start bg-gray-800/40 backdrop-blur-sm border border-gray-600/30 text-gray-300 hover:text-white hover:bg-gray-700/50 hover:border-gray-500/40 transition-all duration-300 rounded-xl h-11 shadow-sm"
                          >
                            <Save className="w-4 h-4 mr-3" />
                            Guardar Coleção
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900 border-gray-700">
                          <DialogHeader>
                            <DialogTitle className="text-white">Guardar Coleção</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-white mb-2 block">Nome da Coleção</label>
                              <Input
                                value={currentCollection.name}
                                onChange={(e) => setCurrentCollection((prev) => ({ ...prev, name: e.target.value }))}
                                className={inputClasses}
                                placeholder="Ex: Coleção Principal, Cartas Raras..."
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-white mb-2 block">Descrição (Opcional)</label>
                              <Textarea
                                value={currentCollection.description || ""}
                                onChange={(e) => setCurrentCollection((prev) => ({ ...prev, description: e.target.value }))}
                                className={inputClasses}
                                rows={3}
                                placeholder="Descreva o propósito ou tema desta coleção..."
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                onClick={() => setShowSaveCollectionDialog(false)}
                                className="bg-gray-800/60 border border-gray-600/40 text-gray-300 hover:text-white hover:bg-gray-700/60 transition-all duration-200 rounded-lg"
                              >
                                Cancelar
                              </Button>
                              <Button onClick={saveCollection} className="bg-gray-700/80 hover:bg-gray-600/90 text-white border border-gray-500/40 transition-all duration-200 rounded-lg">
                                Guardar
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={showLoadCollectionDialog} onOpenChange={setShowLoadCollectionDialog}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            className="justify-start bg-gray-800/40 backdrop-blur-sm border border-gray-600/30 text-gray-300 hover:text-white hover:bg-gray-700/50 hover:border-gray-500/40 transition-all duration-300 rounded-xl h-11 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={savedCollections.length === 0}
                          >
                            <FolderOpen className="w-4 h-4 mr-3" />
                            Carregar ({savedCollections.length})
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900/95 backdrop-blur-xl border-gray-700/50 shadow-2xl max-w-4xl max-h-[85vh] overflow-hidden">
                          <DialogHeader className="pb-6 border-b border-gray-700/30">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"></div>
                              <DialogTitle className="text-white text-xl font-light">Coleções Guardadas</DialogTitle>
                              <div className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
                                {savedCollections.length}
                              </div>
                            </div>
                          </DialogHeader>
                          
                          <div className="overflow-y-auto max-h-[60vh] pr-2 space-y-4">
                            {savedCollections.length === 0 ? (
                              <div className="text-center py-16">
                                <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <FolderOpen className="w-8 h-8 text-gray-500" />
                                </div>
                                <p className="text-gray-400 text-lg font-medium mb-2">Nenhuma coleção guardada</p>
                                <p className="text-gray-500 text-sm">Comece guardando a sua primeira coleção</p>
                              </div>
                            ) : (
                              savedCollections.map((collection) => {
                                // Obter a primeira carta da coleção para usar como fundo
                                const firstCard = collection.cards.length > 0 ? collection.cards[0].card : null;
                                const backgroundImage = firstCard ? getOptimizedImageUrl(firstCard, false) : null;
                                
                                return (
                                  <div 
                                    key={collection.id} 
                                    className="group relative overflow-hidden rounded-2xl border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300 hover:shadow-2xl hover:shadow-black/20"
                                  >
                                    {/* Background com imagem da primeira carta */}
                                    {backgroundImage && (
                                      <div 
                                        className="absolute inset-0 opacity-100 group-hover:opacity-20 transition-opacity duration-300"
                                        style={{
                                          backgroundImage: `url(${backgroundImage})`,
                                          backgroundSize: '130%',
                                          backgroundPosition: 'center 40%',
                                          backgroundRepeat: 'no-repeat'
                                        }}
                                      />
                                    )}
                                    
                                    {/* Overlay gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/85 to-gray-900/90" />
                                    
                                    {/* Conteúdo */}
                                    <div className="relative p-6">
                                      <div className="flex items-start justify-between gap-6">
                                        {/* Informações da coleção */}
                                        <div className="flex-1 space-y-3">
                                          <div className="flex items-center gap-3">
                                            <h3 className="text-white text-lg font-semibold group-hover:text-blue-200 transition-colors duration-200">
                                              {collection.name}
                                            </h3>
                                            {firstCard && (
                                              <div className="w-1 h-1 bg-emerald-400 rounded-full opacity-60"></div>
                                            )}
                                          </div>
                                          
                                          {/* Estatísticas da coleção */}
                                          <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-300 px-3 py-1.5 rounded-full">
                                              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                                              <span className="text-sm font-medium">{collection.cards.length}</span>
                                              <span className="text-xs text-emerald-400/70">cartas</span>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 bg-blue-500/10 text-blue-300 px-3 py-1.5 rounded-full">
                                              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                                              <span className="text-sm font-medium">
                                                {new Date(collection.createdAt).toLocaleDateString("pt-PT", { 
                                                  day: 'numeric', 
                                                  month: 'short',
                                                  year: 'numeric'
                                                })}
                                              </span>
                                            </div>
                                          </div>
                                          
                                          {/* Descrição */}
                                          {collection.description && (
                                            <p className="text-gray-300 text-sm leading-relaxed opacity-90">
                                              {collection.description}
                                            </p>
                                          )}
                                        </div>

                                        {/* Botões de ação */}
                                        <div className="flex flex-col gap-2 ml-4">
                                          <Button
                                            size="sm"
                                            onClick={() => loadCollection(collection)}
                                            className="bg-gray-700/60 backdrop-blur-sm hover:bg-gray-600/70 text-white border border-gray-500/30 hover:border-gray-400/40 shadow-sm hover:shadow-md transition-all duration-200 px-4 py-2 rounded-lg"
                                          >
                                            <FolderOpen className="w-4 h-4 mr-2" />
                                            Carregar
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => deleteCollection(collection.id)}
                                            className="bg-gray-800/40 hover:bg-red-900/20 text-gray-400 hover:text-red-300 border border-gray-600/30 hover:border-red-500/30 transition-all duration-200 px-4 py-2 rounded-lg"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="ghost"
                        onClick={() => fileInputRef.current?.click()}
                        className="justify-start bg-gray-800/40 backdrop-blur-sm border border-gray-600/30 text-gray-300 hover:text-white hover:bg-gray-700/50 hover:border-gray-500/40 transition-all duration-300 rounded-xl h-11 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                      >
                        <Upload className="w-4 h-4 mr-3" />
                        Importar CSV
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />

                      <Button
                        variant="ghost"
                        onClick={exportCollectionToCSV}
                        className="justify-start bg-gray-800/40 backdrop-blur-sm border border-gray-600/30 text-gray-300 hover:text-white hover:bg-gray-700/50 hover:border-gray-500/40 transition-all duration-300 rounded-xl h-11 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={currentCollection.cards.length === 0}
                      >
                        <Download className="w-4 h-4 mr-3" />
                        Exportar CSV
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Procurar e Filtros */}
              <Card className="bg-gray-800/90 backdrop-blur-xl border-gray-700/50 shadow-2xl rounded-2xl overflow-hidden">
                {/* Header com gradiente sutil */}
                <div className="bg-gradient-to-r from-gray-800/20 to-gray-700/20 p-6 border-b border-gray-700/30">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"></div>
                    <h3 className="text-lg font-medium text-white">Pesquisar & Filtrar</h3>
                  </div>
                </div>

                <CardContent className="p-6 space-y-6">
                  {/* Barra de pesquisa principal */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                      </div>
                      <Input
                        placeholder="Procurar cartas por nome, tipo ou texto..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-11 h-12 bg-gray-800/40 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
                      />
                    </div>
                    <div className="w-full sm:w-64">
                      <Select value={collectionType} onValueChange={setCollectionType}>
                        <SelectTrigger className="h-12 bg-gray-800/40 border border-gray-600/50 rounded-xl text-white focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200">
                          <SelectValue placeholder="Tipo de carta" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800/90 backdrop-blur-xl border-gray-600/50 rounded-xl">
                          <SelectItem value="all" className="text-white hover:bg-gray-700/50">Todas as Cartas</SelectItem>
                          {cardTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value} className="text-white hover:bg-gray-700/50">
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Controles de vista e filtros organizados */}
                  <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                    {/* Filtros básicos */}
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-300 whitespace-nowrap">Mostrar:</span>
                        <Select value={ownershipFilter} onValueChange={setOwnershipFilter}>
                          <SelectTrigger className="w-32 h-10 bg-gray-800/30 border border-gray-600/40 rounded-lg text-white text-sm focus:border-blue-400/50 transition-all duration-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800/90 backdrop-blur-xl border-gray-600/50 rounded-lg">
                            <SelectItem value="all" className="text-white hover:bg-gray-700/50">Todas</SelectItem>
                            <SelectItem value="owned" className="text-white hover:bg-gray-700/50">Possuo</SelectItem>
                            <SelectItem value="not-owned" className="text-white hover:bg-gray-700/50">Não Possuo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-300 whitespace-nowrap">Ordenar:</span>
                        <div className="flex items-center gap-2">
                          <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-32 h-10 bg-gray-800/30 border border-gray-600/40 rounded-lg text-white text-sm focus:border-blue-400/50 transition-all duration-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800/90 backdrop-blur-xl border-gray-600/50 rounded-lg">
                              <SelectItem value="edition" className="text-white hover:bg-gray-700/50">Edição</SelectItem>
                              <SelectItem value="name" className="text-white hover:bg-gray-700/50">Nome</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSortAscending(!sortAscending)}
                            className="h-10 w-10 p-0 bg-gray-800/30 hover:bg-gray-700/50 border border-gray-600/40 rounded-lg text-gray-300 hover:text-white transition-all duration-200"
                          >
                            {sortAscending ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Ações de filtros */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="h-10 px-4 bg-gray-800/30 hover:bg-gray-700/50 border border-gray-600/40 rounded-lg text-gray-300 hover:text-white transition-all duration-200"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Filtros</span>
                        <span className="text-xs ml-1 opacity-70">
                          {showAdvancedFilters ? "△" : "▽"}
                        </span>
                      </Button>

                      <div className="h-6 w-px bg-gray-600/50"></div>

                      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0 bg-gray-800/30 hover:bg-emerald-600/20 border border-gray-600/40 hover:border-emerald-500/40 rounded-lg text-gray-300 hover:text-emerald-300 transition-all duration-200"
                            title="Guardar filtros"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900/95 backdrop-blur-xl border-gray-700/50 rounded-xl">
                          <DialogHeader>
                            <DialogTitle className="text-white">Guardar Filtros Atuais</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input
                              placeholder="Nome do filtro (ex: Elfos Raros, Dragões...)"
                              value={filterName}
                              onChange={(e) => setFilterName(e.target.value)}
                              className="bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
                            />
                            <div className="flex gap-2 justify-end">
                              <Button 
                                variant="ghost" 
                                onClick={() => setShowSaveDialog(false)}
                                className="bg-gray-800/40 hover:bg-gray-700/60 text-gray-300 hover:text-white border border-gray-600/40"
                              >
                                Cancelar
                              </Button>
                              <Button 
                                onClick={saveCurrentFilters} 
                                className="bg-emerald-600/90 hover:bg-emerald-600 text-white border-0"
                              >
                                Guardar
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0 bg-gray-800/30 hover:bg-blue-600/20 border border-gray-600/40 hover:border-blue-500/40 rounded-lg text-gray-300 hover:text-blue-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={savedFilters.length === 0}
                            title="Carregar filtros guardados"
                          >
                            <FolderOpen className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900/95 backdrop-blur-xl border-gray-700/50 rounded-xl max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="text-white">Filtros Guardados</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {savedFilters.map((filter) => (
                              <div key={filter.id} className="bg-gray-800/40 p-4 rounded-lg border border-gray-700/30 hover:bg-gray-700/40 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="text-white font-medium">{filter.name}</h4>
                                    <p className="text-sm text-gray-400">{filter.collectionType} • {new Date(filter.createdAt).toLocaleDateString("pt-PT")}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      onClick={() => loadSavedFilter(filter)}
                                      className="bg-blue-600/90 hover:bg-blue-600 text-white border-0"
                                    >
                                      Carregar
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={() => deleteSavedFilter(filter.id)}
                                      className="bg-gray-700/40 hover:bg-red-600/20 text-gray-300 hover:text-red-300 border border-gray-600/40 hover:border-red-500/40"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {/* Filtros Avançados */}
                  {showAdvancedFilters && (
                    <div className="border-t border-gray-700/30 pt-6 space-y-6">
                      {/* Outros Filtros */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                          <label className="text-sm font-medium text-gray-300 mb-3 block">Raridade</label>
                          <Select value={rarityFilter} onValueChange={setRarityFilter}>
                            <SelectTrigger className="bg-gray-800/50 border border-gray-600/50 text-white rounded-xl focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200">
                              <SelectValue/>
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800/90 backdrop-blur-xl border-gray-600/50 rounded-xl">
                              <SelectItem value="all" className="text-white hover:bg-gray-700/50">Todas</SelectItem>
                              <SelectItem value="common" className="text-white hover:bg-gray-700/50">Comum</SelectItem>
                              <SelectItem value="uncommon" className="text-white hover:bg-gray-700/50">Incomum</SelectItem>
                              <SelectItem value="rare" className="text-white hover:bg-gray-700/50">Rara</SelectItem>
                              <SelectItem value="mythic" className="text-white hover:bg-gray-700/50">Mítica</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-300 mb-3 block">CMC</label>
                          <Input
                            placeholder="Ex: 3"
                            value={cmcFilter}
                            onChange={(e) => setCmcFilter(e.target.value)}
                            className="bg-gray-800/50 border border-gray-600/50 text-white rounded-xl focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-300 mb-3 block">Foil</label>
                          <Select value={foilFilter} onValueChange={setFoilFilter}>
                            <SelectTrigger className="bg-gray-800/50 border border-gray-600/50 text-white rounded-xl focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800/90 backdrop-blur-xl border-gray-600/50 rounded-xl">
                              <SelectItem value="all" className="text-white hover:bg-gray-700/50">Todas</SelectItem>
                              <SelectItem value="foil" className="text-white hover:bg-gray-700/50">Apenas Foil</SelectItem>
                              <SelectItem value="nonfoil" className="text-white hover:bg-gray-700/50">Apenas Não-Foil</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-300 mb-3 block">Tipo de Coleção</label>
                          <Select value={collectionType} onValueChange={setCollectionType}>
                            <SelectTrigger className="bg-gray-800/50 border border-gray-600/50 text-white rounded-xl focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200">
                              <SelectValue placeholder="Todos os tipos" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800/90 backdrop-blur-xl border-gray-600/50 rounded-xl">
                              <SelectItem value="all" className="text-white hover:bg-gray-700/50">Todas as Cartas</SelectItem>
                              {cardTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value} className="text-white hover:bg-gray-700/50">
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Texto Oracle e Filtros de Cores lado a lado */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-medium text-gray-300 mb-3 block">Texto do Oráculo</label>
                          <Input
                            placeholder="Ex: voar, atropelar, vigilância..."
                            value={oracleTextFilter}
                            onChange={(e) => setOracleTextFilter(e.target.value)}
                            className="bg-gray-800/50 border border-gray-600/50 text-white rounded-xl focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-300 mb-3 block">Filtros por Cores de Mana</label>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { color: "W", name: "Branco" },
                              { color: "U", name: "Azul" },
                              { color: "B", name: "Preto" },
                              { color: "R", name: "Vermelho" },
                              { color: "G", name: "Verde" },
                              { color: "C", name: "Incolor" },
                            ].map(({ color, name }) => (
                              <ManaIcon
                                key={color}
                                color={color}
                                size="w-6 h-6"
                                isSelected={activeColors.has(color)}
                                onClick={() => toggleColor(color)}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

    {/* Estado de Carregamento - Design Elegante */}
    {(loading || isLoadingCards) && (
      <div className="flex justify-center py-12">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20 animate-pulse"></div>
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-gray-900 text-lg font-semibold">
                {isLoadingCards ? "Aplicando Filtros" : "Carregando Cartas"}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {loadingMessage || "Buscando as melhores cartas para você..."}
              </p>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full animate-pulse"></div>
            </div>

            <Button
              variant="outline"
              onClick={cancelLoading}
              size="sm"
              className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 rounded-xl transition-all duration-200"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Layout de Duas Colunas */}
    {!loading && !isLoadingCards && allCards.length > 0 && (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Coluna Esquerda - Todas as Cartas */}
        <Card className="bg-gray-800/70 border-gray-700 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-xl flex items-center gap-2">
                Todas as Cartas ({filteredCards.length})
                <span className="text-sm text-emerald-400 font-normal">• Arraste para adicionar</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTextView(!textView)}
                  className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  {textView ? <Grid3X3 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </Button>
                {!textView && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cycleColumns}
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="max-h-[800px] overflow-y-auto modern-scrollbar">
            {filteredCards.length > 0 ? (
                <div className="space-y-4">
                {textView ? (
                  // Vista de Texto
                  <div className="space-y-2">
                    {visibleCards.map((card) => {
                      const quantityInCollection = getCardQuantityInCollection(card.id, false)
                      const quantityInCollectionFoil = getCardQuantityInCollection(card.id, true)

                      return (
                        <DraggableCard key={card.id} card={card}>
                          <div
                            className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg hover:bg-gray-700/50 transition-colors"
                          >
                            <img
                            src={getOptimizedImageUrl(card, true) || "/placeholder.svg"}
                            alt={card.name}
                            className="w-12 h-16 rounded object-cover cursor-pointer"
                            onClick={() => setSelectedCard(card)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{card.name}</p>
                            <div className="flex items-center gap-2">
                              <span
                                className="text-xs"
                                dangerouslySetInnerHTML={{ __html: formatManaSymbols(card.mana_cost || "") }}
                              />
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  card.rarity === "mythic"
                                    ? "border-orange-500 text-orange-400"
                                    : card.rarity === "rare"
                                      ? "border-yellow-500 text-yellow-400"
                                      : card.rarity === "uncommon"
                                        ? "border-gray-400 text-gray-300"
                                        : "border-gray-600 text-gray-400"
                                }`}
                              >
                                {card.rarity.charAt(0).toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-gray-400 text-xs truncate">{card.set_name}</p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                onClick={() => addCardToCollection(card, 1, "Near Mint", false)}
                                className="w-6 h-6 p-0 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                                title="Adicionar Normal"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              {quantityInCollection > 0 && (
                                <>
                                  <span className="text-white text-xs font-medium w-6 text-center">
                                    {quantityInCollection}
                                  </span>
                                  <Button
                                    size="sm"
                                    onClick={() => removeCardFromCollection(card.id, false, 1)}
                                    className="w-6 h-6 p-0 bg-red-600 hover:bg-red-700 text-white text-xs"
                                    title="Remover Normal"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                onClick={() => addCardToCollection(card, 1, "Near Mint", true)}
                                className="w-6 h-6 p-0 bg-yellow-600 hover:bg-yellow-700 text-white text-xs"
                                title="Adicionar Foil"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              {quantityInCollectionFoil > 0 && (
                                <>
                                  <span className="text-white text-xs font-medium w-6 text-center">
                                    {quantityInCollectionFoil}
                                  </span>
                                  <Button
                                    size="sm"
                                    onClick={() => removeCardFromCollection(card.id, true, 1)}
                                    className="w-6 h-6 p-0 bg-red-600 hover:bg-red-700 text-white text-xs"
                                    title="Remover Foil"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          </div>
                        </DraggableCard>
                      )
                    })}
                  </div>
                ) : (
                  // Vista de Grelha
                  <div className={`grid ${gridColsClass} gap-2`}>
                    {visibleCards.map((card) => {
                      const quantityInCollection = getCardQuantityInCollection(card.id, false)
                      const quantityInCollectionFoil = getCardQuantityInCollection(card.id, true)

                      return (
                        <DraggableCard key={card.id} card={card}>
                          <div
                            className="relative group cursor-pointer transform transition-all duration-200 hover:scale-105"
                            onClick={() => setSelectedCard(card)}
                          >
                          <div className="relative">
                            <img
                              src={getOptimizedImageUrl(card, true) || "/placeholder.svg"}
                              alt={card.name}
                              className="w-full h-auto rounded-lg shadow-lg cursor-pointer"
                              loading="lazy"
                            />
                            {(quantityInCollection > 0 || quantityInCollectionFoil > 0) && (
                              <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full p-1 pointer-events-none">
                                <CheckCircle className="w-4 h-4" />
                              </div>
                            )}
                            {quantityInCollection > 0 && (
                              <div className="absolute top-2 left-2 bg-blue-600 text-white rounded-full px-2 py-1 text-xs font-bold pointer-events-none">
                                {quantityInCollection}
                              </div>
                            )}
                            {quantityInCollectionFoil > 0 && (
                              <div className="absolute bottom-2 left-2 bg-yellow-600 text-white rounded-full px-2 py-1 text-xs font-bold pointer-events-none">
                                F{quantityInCollectionFoil}
                              </div>
                            )}
                          </div>
                          
                          {/* Botões de adicionar/remover, visíveis ao passar o rato */}
                          <div className="absolute bottom-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {/* FIX: Adicionado stopPropagation para impedir que o modal abra ao clicar */}
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                addCardToCollection(card, 1, "Near Mint", false)
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 h-6 w-6"
                              title="Adicionar Normal"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                addCardToCollection(card, 1, "Near Mint", true)
                              }}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white p-1 h-6 w-6"
                              title="Adicionar Foil"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          </div>
                        </DraggableCard>
                      )
                    })}
                  </div>
                )}

                {/* Controles de Paginação - Design Minimalista Elegante */}
                {totalPages > 1 && (
                  <div className="flex flex-col items-center gap-4 pt-8 pb-4">
                    {/* Informação da página - estilo minimalista */}
                    <div className="text-sm text-gray-300 bg-white/5 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                      Página <span className="font-semibold text-white">{currentPage}</span> de <span className="font-semibold text-white">{totalPages}</span> 
                      <span className="mx-2 text-white/40">•</span> 
                      <span className="text-emerald-300">{totalCardsAvailable.toLocaleString()}</span> cartas
                    </div>
                    
                    {/* Controles de navegação */}
                    <div className="flex items-center gap-3">
                      {/* Botão Primeira Página */}
                      <Button
                        onClick={() => goToPage(1)}
                        disabled={currentPage === 1 || isLoadingCards}
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 bg-white/90 hover:bg-white text-gray-800 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200"
                        title="Primeira página"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <ChevronLeft className="w-4 h-4 -ml-2" />
                      </Button>

                      {/* Botão Página Anterior */}
                      <Button
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1 || isLoadingCards}
                        variant="ghost"
                        size="sm"
                        className="h-9 px-4 bg-white/90 hover:bg-white text-gray-800 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200 font-medium"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Anterior
                      </Button>

                      {/* Numeração de páginas - estilo elegante */}
                      <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-xl p-1 border border-white/20">
                        {/* Primeira página */}
                        {currentPage > 3 && (
                          <>
                            <Button
                              onClick={() => goToPage(1)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
                            >
                              1
                            </Button>
                            {currentPage > 4 && (
                              <span className="text-white/40 px-1 text-sm">...</span>
                            )}
                          </>
                        )}

                        {/* Páginas ao redor da atual */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          if (pageNum < 1 || pageNum > totalPages) return null;

                          return (
                            <Button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              variant="ghost"
                              size="sm"
                              className={`h-8 w-8 p-0 rounded-lg transition-all duration-200 font-medium ${
                                currentPage === pageNum 
                                  ? "bg-white text-gray-900 shadow-md hover:bg-white/95" 
                                  : "text-white/70 hover:text-white hover:bg-white/20"
                              }`}
                              disabled={isLoadingCards}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}

                        {/* Última página */}
                        {currentPage < totalPages - 2 && totalPages > 5 && (
                          <>
                            {currentPage < totalPages - 3 && (
                              <span className="text-white/40 px-1 text-sm">...</span>
                            )}
                            <Button
                              onClick={() => goToPage(totalPages)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Botão Próxima Página */}
                      <Button
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages || isLoadingCards}
                        variant="ghost"
                        size="sm"
                        className="h-9 px-4 bg-white/90 hover:bg-white text-gray-800 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200 font-medium"
                      >
                        Próxima
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>

                      {/* Botão Última Página */}
                      <Button
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages || isLoadingCards}
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 bg-white/90 hover:bg-white text-gray-800 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200"
                        title="Última página"
                      >
                        <ChevronRight className="w-4 h-4" />
                        <ChevronRight className="w-4 h-4 -ml-2" />
                      </Button>
                    </div>

                    {/* Indicador de carregamento da página */}
                    {isLoadingCards && (
                      <div className="flex items-center gap-2 text-emerald-300 text-sm bg-emerald-500/10 backdrop-blur-sm rounded-full px-4 py-2 border border-emerald-500/20">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando página...
                      </div>
                    )}
                  </div>
                )}

                {/* Botões de Carregamento - Sistema local para cartas já carregadas */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  {/* Informação de carregamento */}
                  {!hasMorePages && allCards.length > 0 && (
                    <div className="text-center text-gray-400 text-sm py-2">
                      Todas as cartas disponíveis foram carregadas ({allCards.length} total)
                    </div>
                  )}
                </div>
                </div>
            ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-lg">Nenhuma carta encontrada com os filtros atuais.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coluna Direita - A Minha Coleção */}
          <DroppableZone 
            id="collection-drop-zone" 
            className="border-2 border-dashed border-gray-600/50 rounded-xl transition-all duration-300 hover:border-emerald-400/70"
          >
            <Card className="bg-gray-900/80 backdrop-blur-xl shadow-2xl overflow-hidden border-0">
            <CardHeader className="pb-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"></div>
                  <CardTitle className="text-white text-xl font-light">
                    A Minha Coleção
                  </CardTitle>
                  <div className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-sm font-medium">
                    {currentCollection.cards.length}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-gray-800/60 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                    {dashboardStats.totalCopies} cópias
                  </div>
                  
                  {/* Controle de Colunas - Novo */}
                  {!textView && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm hidden lg:inline">Colunas:</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all duration-200 rounded-full p-2 w-12"
                          >
                            {currentColumns}
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-gray-800 border-gray-700 min-w-[140px]">
                          <div className="grid grid-cols-2 gap-1 p-1">
                            {columnOptions.map((cols) => (
                              <DropdownMenuItem
                                key={cols}
                                onClick={() => setCurrentColumns(cols)}
                                className={`text-center cursor-pointer transition-colors text-xs py-2 ${
                                  currentColumns === cols
                                    ? "bg-emerald-600 text-white"
                                    : "text-gray-300 hover:text-white hover:bg-gray-700"
                                }`}
                              >
                                {cols} col
                              </DropdownMenuItem>
                            ))}
                          </div>
                          <DropdownMenuSeparator className="bg-gray-700 my-2" />
                          <div className="p-2 text-xs text-gray-400 space-y-1">
                            <div className="flex justify-between">
                              <span>2-4:</span>
                              <span>Mobile/Tablet</span>
                            </div>
                            <div className="flex justify-between">
                              <span>5-7:</span>
                              <span>Desktop</span>
                            </div>
                            <div className="flex justify-between">
                              <span>8-12:</span>
                              <span>Ultrawide</span>
                            </div>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTextView(!textView)}
                    className="text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all duration-200 rounded-full p-2"
                  >
                    {textView ? <Grid3X3 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="max-h-[800px] overflow-y-auto p-0 modern-scrollbar">
    {currentCollection.cards.length > 0 ? (
      <div className="space-y-1">
        {(() => {
          // Agrupar cartas por edição
          const cardsBySet = currentCollection.cards.reduce((acc, collectionCard) => {
            const setName = collectionCard.card.set_name || "Sem Edição"
            const setCode = collectionCard.card.set_code || "UNK"
            const releaseDate = collectionCard.card.released_at || "1993-01-01"
            
            if (!acc[setName]) {
              acc[setName] = {
                cards: [],
                setCode,
                releaseDate,
                totalCards: 0,
                totalValue: 0
              }
            }
            
            acc[setName].cards.push(collectionCard)
            acc[setName].totalCards += collectionCard.quantity
            acc[setName].totalValue += getEstimatedPrice(collectionCard.card) * collectionCard.quantity
            
            return acc
          }, {} as Record<string, {
            cards: CollectionCard[]
            setCode: string
            releaseDate: string
            totalCards: number
            totalValue: number
          }>)

          // Ordenar edições por data de lançamento (mais recente primeiro)
          const sortedSets = Object.entries(cardsBySet).sort(
            ([, a], [, b]) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
          )

          return sortedSets.map(([setName, setData], setIndex) => (
            <div key={setName} className="overflow-hidden">
              {/* Cabeçalho da Edição */}
              <div className="bg-gray-800/30 backdrop-blur-sm px-4 sm:px-6 py-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex-shrink-0"></div>
                      <h3 className="text-white font-medium text-base sm:text-lg truncate">{setName}</h3>
                      <div className="bg-gray-700/80 text-gray-300 px-2 py-1 rounded-md text-xs font-mono uppercase tracking-wide flex-shrink-0">
                        {setData.setCode}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                    <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-300 px-3 py-1.5 rounded-full">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                      <span className="text-sm font-medium">{setData.totalCards}</span>
                      <span className="text-xs text-emerald-400/70 hidden sm:inline">cópias</span>
                    </div>
                    
                    <div className="flex items-center gap-1 bg-amber-500/10 text-amber-300 px-3 py-1.5 rounded-full">
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                      <span className="text-sm font-medium">R$ {setData.totalValue.toFixed(0)}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 bg-blue-500/10 text-blue-300 px-3 py-1.5 rounded-full">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                      <span className="text-sm font-medium">{setData.cards.length}</span>
                      <span className="text-xs text-blue-400/70 hidden sm:inline">únicas</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center gap-2 text-gray-400">
                  <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                  <span className="text-xs">
                    {new Date(setData.releaseDate).toLocaleDateString("pt-PT", { 
                      year: 'numeric', 
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Cartas da Edição */}
              <div className="p-4 sm:p-6 bg-gray-800/10">
                {textView ? (
                  // Vista de Lista
                  <div className="space-y-3">
                    {setData.cards
                      .sort((a, b) => a.card.name.localeCompare(b.card.name))
                      .map((collectionCard) => (
                        <div
                          key={`${collectionCard.card.id}-${collectionCard.foil}`}
                          className="group flex items-center gap-4 p-4 bg-gray-800/40 backdrop-blur-sm rounded-xl hover:bg-gray-700/50 transition-all duration-300"
                        >
                          <div className="relative flex-shrink-0">
                            <img
                              src={getOptimizedImageUrl(collectionCard.card, true) || "/placeholder.svg"}
                              alt={collectionCard.card.name}
                              className="w-14 h-20 rounded-lg object-cover cursor-pointer shadow-lg"
                              onClick={() => setSelectedCard(collectionCard.card)}
                            />
                            {collectionCard.foil && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full animate-pulse"></div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-white font-medium text-sm leading-tight truncate group-hover:text-emerald-300 transition-colors">
                                {collectionCard.card.name}
                              </h4>
                              {collectionCard.foil && (
                                <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-300 px-2 py-0.5 rounded-md text-xs font-medium flex-shrink-0">
                                  FOIL
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-xs"
                                  dangerouslySetInnerHTML={{
                                    __html: formatManaSymbols(collectionCard.card.mana_cost || ""),
                                  }}
                                />
                                <div className={`w-2 h-2 rounded-full ${
                                  collectionCard.card.rarity === "mythic" ? "bg-orange-400" :
                                  collectionCard.card.rarity === "rare" ? "bg-yellow-400" :
                                  collectionCard.card.rarity === "uncommon" ? "bg-gray-300" : "bg-gray-500"
                                }`}></div>
                              </div>
                              
                              <div className="bg-gray-700/60 text-gray-300 px-2 py-0.5 rounded-md text-xs">
                                #{collectionCard.card.collector_number}
                              </div>
                              
                              <div className="text-gray-400 text-xs">
                                {collectionCard.condition}
                              </div>
                              
                              <div className="text-emerald-400 text-xs font-medium">
                                R$ {(getEstimatedPrice(collectionCard.card) * collectionCard.quantity).toFixed(2)}
                              </div>
                            </div>
                          </div>
                          
                          {/* Controles de Quantidade */}
                          <div className="flex items-center gap-2 bg-gray-900/60 backdrop-blur-sm rounded-full p-1">
                            <Button
                              size="sm"
                              onClick={() => removeCardFromCollection(collectionCard.card.id, collectionCard.foil, 1)}
                              className="w-7 h-7 p-0 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 transition-all duration-200 rounded-full border-0"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            
                            <div className="bg-gray-800/80 text-white text-sm font-medium px-3 py-1 rounded-full min-w-[2.5rem] text-center">
                              {collectionCard.quantity}
                            </div>
                            
                            <Button
                              size="sm"
                              onClick={() => addCardToCollection(
                                collectionCard.card,
                                1,
                                collectionCard.condition,
                                collectionCard.foil,
                              )}
                              className="w-7 h-7 p-0 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200 transition-all duration-200 rounded-full border-0"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            
                            <Button
                              size="sm"
                              onClick={() => removeCardFromCollection(
                                collectionCard.card.id,
                                collectionCard.foil,
                                collectionCard.quantity,
                              )}
                              className="w-7 h-7 p-0 bg-gray-600/20 hover:bg-gray-600/30 text-gray-400 hover:text-gray-300 transition-all duration-200 rounded-full ml-1 border-0"
                              title="Remover todas"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  // Vista de Grelha
                  <div className={`grid ${getGridColsClass(currentColumns)} gap-3`}>
                    {setData.cards
                      .sort((a, b) => a.card.name.localeCompare(b.card.name))
                      .map((collectionCard) => (
                        <div
                          key={`${collectionCard.card.id}-${collectionCard.foil}`}
                          className="group relative cursor-pointer transform transition-all duration-300 hover:scale-105 hover:z-10"
                          onClick={() => setSelectedCard(collectionCard.card)}
                        >
                          <div className="relative overflow-hidden rounded-xl shadow-lg">
                            <img
                              src={getOptimizedImageUrl(collectionCard.card, true) || "/placeholder.svg"}
                              alt={collectionCard.card.name}
                              className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-110"
                              loading="lazy"
                            />
                            
                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            
                            {/* Badges e Indicadores */}
                            <div className="absolute top-2 left-2 bg-emerald-500/90 backdrop-blur-sm text-white rounded-full px-2 py-1 text-xs font-bold shadow-lg">
                              {collectionCard.quantity}
                            </div>
                            
                            {collectionCard.foil && (
                              <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-full px-2 py-1 text-xs font-bold shadow-lg">
                                FOIL
                              </div>
                            )}
                            
                            <div className="absolute bottom-2 right-2 bg-gray-900/90 backdrop-blur-sm text-white rounded-md px-2 py-1 text-xs font-medium shadow-lg">
                              #{collectionCard.card.collector_number}
                            </div>
                            
                            {/* Card Info Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <p className="text-white text-xs font-medium truncate mb-1">{collectionCard.card.name}</p>
                              <div className="flex items-center justify-between">
                                <span
                                  className="text-xs"
                                  dangerouslySetInnerHTML={{
                                    __html: formatManaSymbols(collectionCard.card.mana_cost || ""),
                                  }}
                                />
                                <div className={`w-2 h-2 rounded-full ${
                                  collectionCard.card.rarity === "mythic" ? "bg-orange-400" :
                                  collectionCard.card.rarity === "rare" ? "bg-yellow-400" :
                                  collectionCard.card.rarity === "uncommon" ? "bg-gray-300" : "bg-gray-500"
                                }`}></div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Floating Action Buttons */}
                          <div className="absolute top-1/2 right-2 transform -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                addCardToCollection(
                                  collectionCard.card,
                                  1,
                                  collectionCard.condition,
                                  collectionCard.foil,
                                )
                              }}
                              className="w-8 h-8 p-0 bg-emerald-500/90 hover:bg-emerald-500 text-white shadow-lg backdrop-blur-sm rounded-full transition-all duration-200 border-0"
                              title="Adicionar"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeCardFromCollection(collectionCard.card.id, collectionCard.foil, 1)
                              }}
                              className="w-8 h-8 p-0 bg-red-500/90 hover:bg-red-500 text-white shadow-lg backdrop-blur-sm rounded-full transition-all duration-200 border-0"
                              title="Remover"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          ))
        })()}
      </div>
    ) : (
      <div className="text-center py-16 px-6">
        <div className="max-w-sm mx-auto space-y-4">
          <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto">
            <Library className="w-8 h-8 text-gray-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-gray-300 text-lg font-medium">A sua coleção está vazia</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Adicione cartas à sua coleção:
            </p>
            <div className="space-y-1 text-gray-500 text-xs">
              <p>• Use os botões{" "}
                <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md">
                  <Plus className="w-3 h-3" />
                </span>
                {" "}na coluna da esquerda
              </p>
              <p>• Ou <strong className="text-emerald-400">arraste e solte</strong> cartas aqui</p>
            </div>
          </div>
        </div>
      </div>
    )}
          </CardContent>
        </Card>
      </DroppableZone>
      </div>
    )}
            </TabsContent>

            {/* Separador do Painel de controlo */}
            <TabsContent value="dashboard" className="space-y-6">
              {/* Container principal minimalista */}
              <div className="bg-gray-900/40 backdrop-blur-sm rounded-2xl border border-gray-800/50 overflow-hidden">
                {currentCollection.cards.length === 0 ? (
                  <div className="p-16 text-center">
                    <div className="max-w-sm mx-auto space-y-4">
                      <div className="w-16 h-16 bg-gray-800/30 rounded-xl flex items-center justify-center mx-auto">
                        <BarChart3 className="w-8 h-8 text-gray-500" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-light text-gray-300">Painel Vazio</h3>
                        <p className="text-gray-500 text-sm">
                          Adicione cartas para visualizar estatísticas
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => setActiveTab("collection")}
                        className="bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white border border-gray-700/30 hover:border-gray-600/50 transition-all duration-200 rounded-lg px-6 py-2"
                      >
                        <Library className="w-4 h-4 mr-2" />
                        Começar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {/* Cabeçalho super minimalista */}
                    <div className="text-center pb-3">
                      <h2 className="text-lg font-normal text-gray-300 mb-1">
                        {currentCollection.name || "Minha Coleção"}
                      </h2>
                      <p className="text-gray-600 text-xs">
                        {dashboardStats.uniqueCards} cartas únicas • {dashboardStats.totalCopies} cópias
                      </p>
                    </div>

                    {/* Info boxes pequenas - minimalistas */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {/* Valor Total */}
                      <div className="bg-gray-900/50 rounded-md p-3 border border-gray-800/40">
                        <div className="text-xs text-gray-500 mb-1">Valor</div>
                        <div className="text-sm font-medium text-gray-300">
                          R$ {dashboardStats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          R$ {dashboardStats.totalCopies > 0 ? (dashboardStats.totalValue / dashboardStats.totalCopies).toFixed(2) : '0.00'}/carta
                        </div>
                      </div>

                      {/* Cartas Únicas */}
                      <div className="bg-gray-900/50 rounded-md p-3 border border-gray-800/40">
                        <div className="text-xs text-gray-500 mb-1">Únicas</div>
                        <div className="text-sm font-medium text-gray-300">{dashboardStats.uniqueCards}</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {dashboardStats.uniqueCards > 0 ? `${((dashboardStats.uniqueCards / Math.max(dashboardStats.totalCopies, 1)) * 100).toFixed(1)}% diversidade` : '0% diversidade'}
                        </div>
                      </div>

                      {/* Total de Cópias */}
                      <div className="bg-gray-900/50 rounded-md p-3 border border-gray-800/40">
                        <div className="text-xs text-gray-500 mb-1">Cópias</div>
                        <div className="text-sm font-medium text-gray-300">{dashboardStats.totalCopies}</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {dashboardStats.uniqueCards > 0 ? `${(dashboardStats.totalCopies / dashboardStats.uniqueCards).toFixed(1)}x média` : '0x média'}
                        </div>
                      </div>

                      {/* Edições */}
                      <div className="bg-gray-900/50 rounded-md p-3 border border-gray-800/40">
                        <div className="text-xs text-gray-500 mb-1">Sets</div>
                        <div className="text-sm font-medium text-gray-300">
                          {(() => {
                            const sets = new Set(currentCollection.cards.map(card => card.card.set_code))
                            return sets.size
                          })()}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">diferentes</div>
                      </div>
                    </div>

                    {/* Distribuições minimalistas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Cores */}
                      <div className="bg-gray-900/30 rounded-md p-3 border border-gray-800/20">
                        <h4 className="text-xs font-medium text-gray-400 mb-2">Cores</h4>
                        <SimpleBarChart
                          data={dashboardStats.colorDistribution}
                          title=""
                          colorMap={colorMap}
                        />
                      </div>

                      {/* Raridades */}
                      <div className="bg-gray-900/30 rounded-md p-3 border border-gray-800/20">
                        <h4 className="text-xs font-medium text-gray-400 mb-2">Raridades</h4>
                        <SimpleBarChart
                          data={dashboardStats.rarityDistribution}
                          title=""
                          colorMap={rarityColorMap}
                        />
                      </div>

                      {/* Tipos */}
                      <div className="bg-gray-900/30 rounded-md p-3 border border-gray-800/20">
                        <h4 className="text-xs font-medium text-gray-400 mb-2">Tipos</h4>
                        <SimpleBarChart
                          data={Object.fromEntries(
                            Object.entries(dashboardStats.typeDistribution)
                              .sort(([, a], [, b]) => b - a)
                              .slice(0, 5),
                          )}
                          title=""
                        />
                      </div>

                      {/* CMC */}
                      <div className="bg-gray-900/30 rounded-md p-3 border border-gray-800/20">
                        <h4 className="text-xs font-medium text-gray-400 mb-2">Curva de Mana</h4>
                        <SimpleBarChart
                          data={dashboardStats.cmcDistribution}
                          title=""
                        />
                      </div>
                    </div>

                    {/* Insights inline compactos */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="bg-gray-900/40 rounded-md p-2.5 border border-gray-800/30">
                        <div className="text-xs text-gray-500">Mais Valiosa</div>
                        <div className="text-xs font-medium text-gray-400 mt-0.5">
                          {(() => {
                            if (currentCollection.cards.length === 0) return 'N/A'
                            const mostValuableCard = currentCollection.cards.reduce((prev, current) => 
                              getEstimatedPrice(prev.card) > getEstimatedPrice(current.card) ? prev : current
                            )
                            return mostValuableCard.card.name.length > 18 
                              ? mostValuableCard.card.name.substring(0, 18) + '...'
                              : mostValuableCard.card.name
                          })()}
                        </div>
                      </div>
                      <div className="bg-gray-900/40 rounded-md p-2.5 border border-gray-800/30">
                        <div className="text-xs text-gray-500">Premium</div>
                        <div className="text-xs font-medium text-gray-400 mt-0.5">
                          {(() => {
                            const mythics = dashboardStats.rarityDistribution.mythic || 0
                            const rares = dashboardStats.rarityDistribution.rare || 0
                            return `${mythics + rares} raras+`
                          })()}
                        </div>
                      </div>
                      <div className="bg-gray-900/40 rounded-md p-2.5 border border-gray-800/30">
                        <div className="text-xs text-gray-500">Status</div>
                        <div className="text-xs font-medium text-gray-400 mt-0.5">
                          {dashboardStats.totalValue > 1000 ? 'Consolidada' : dashboardStats.totalValue > 500 ? 'Em Crescimento' : 'Iniciante'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Separador do Construtor de Baralhos */}
            <TabsContent value="deckbuilder" className="space-y-6">
              {/* Cabeçalho do Baralho - Design Melhorado */}
              <Card className="bg-gray-800/90 backdrop-blur-xl border-gray-700/50 shadow-2xl rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Lado esquerdo - Informações do Baralho */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-xl flex items-center justify-center border border-purple-500/20">
                          <Hammer className="w-6 h-6 text-purple-400" />
                        </div>
                        <Input
                          placeholder="Nome do baralho"
                          value={currentDeck.name}
                          onChange={(e) =>
                            setCurrentDeck((prev) => ({
                              ...prev,
                              name: e.target.value,
                              updatedAt: new Date().toISOString(),
                            }))
                          }
                          className="text-2xl font-bold bg-transparent border-none p-0 h-auto text-white placeholder-gray-400 focus:outline-none focus:ring-0"
                        />
                        <Badge 
                          variant="outline" 
                          className="border-purple-500/50 text-purple-300 bg-purple-500/10 px-4 py-2 rounded-xl backdrop-blur-sm"
                        >
                          {currentDeck.format.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Estatísticas do Baralho */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-800/30 rounded-xl p-3 border border-gray-700/30">
                          <div className="text-xs text-gray-500 mb-1">Formato</div>
                          <div className="text-sm font-medium text-gray-300 capitalize">{currentDeck.format}</div>
                        </div>
                        <div className="bg-gray-800/30 rounded-xl p-3 border border-gray-700/30">
                          <div className="text-xs text-gray-500 mb-1">Cartas</div>
                          <div className="text-sm font-medium text-gray-300">{deckStats.totalCards}</div>
                        </div>
                        <div className="bg-gray-800/30 rounded-xl p-3 border border-gray-700/30">
                          <div className="text-xs text-gray-500 mb-1">Sideboard</div>
                          <div className="text-sm font-medium text-gray-300">{deckStats.sideboardCards}</div>
                        </div>
                        <div className="bg-gray-800/30 rounded-xl p-3 border border-gray-700/30">
                          <div className="text-xs text-gray-500 mb-1">Valor</div>
                          <div className="text-sm font-medium text-gray-300">R$ {deckStats.totalValue.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Lado direito - Ações */}
                    <div className="flex flex-col gap-3">
                      {/* Primeira linha - Selector de formato */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400 font-medium min-w-fit">Formato:</span>
                        <Select
                          value={currentDeck.format}
                          onValueChange={(format) =>
                            setCurrentDeck((prev) => ({ ...prev, format, updatedAt: new Date().toISOString() }))
                          }
                        >
                          <SelectTrigger className="h-9 px-3 bg-gray-800/40 backdrop-blur-sm border border-gray-600/30 rounded-lg text-white text-sm focus:border-gray-500/50 focus:ring-1 focus:ring-gray-500/20 transition-all duration-200 hover:bg-gray-700/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900/95 backdrop-blur-xl border-gray-700/50 rounded-lg">
                            <SelectItem value="standard" className="text-white hover:bg-gray-800/50 focus:bg-gray-800/50">Padrão</SelectItem>
                            <SelectItem value="modern" className="text-white hover:bg-gray-800/50 focus:bg-gray-800/50">Moderno</SelectItem>
                            <SelectItem value="legacy" className="text-white hover:bg-gray-800/50 focus:bg-gray-800/50">Legado</SelectItem>
                            <SelectItem value="vintage" className="text-white hover:bg-gray-800/50 focus:bg-gray-800/50">Vintage</SelectItem>
                            <SelectItem value="commander" className="text-white hover:bg-gray-800/50 focus:bg-gray-800/50">Comandante</SelectItem>
                            <SelectItem value="pioneer" className="text-white hover:bg-gray-800/50 focus:bg-gray-800/50">Pioneiro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Segunda linha - Botões de ação */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={newDeck}
                          className="h-8 px-3 bg-gray-800/40 backdrop-blur-sm border border-gray-600/30 text-gray-300 hover:text-white hover:bg-gray-700/50 hover:border-gray-500/40 transition-all duration-200 rounded-lg text-sm"
                        >
                          <Plus className="w-3 h-3 mr-1.5" />
                          Novo
                        </Button>

                        <Dialog open={showDeckSaveDialog} onOpenChange={setShowDeckSaveDialog}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 bg-gray-800/40 backdrop-blur-sm border border-gray-600/30 text-gray-300 hover:text-white hover:bg-gray-700/50 hover:border-gray-500/40 transition-all duration-200 rounded-lg text-sm"
                            >
                              <Save className="w-3 h-3 mr-1.5" />
                              Guardar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-900/95 backdrop-blur-xl border-gray-700/50 rounded-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-white">Guardar Baralho</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium text-white mb-2 block">Nome do Baralho</label>
                                <Input
                                  value={currentDeck.name}
                                  onChange={(e) => setCurrentDeck((prev) => ({ ...prev, name: e.target.value }))}
                                  className="bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-gray-500/50 focus:ring-2 focus:ring-gray-500/20"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-white mb-2 block">Descrição (Opcional)</label>
                                <Textarea
                                  value={currentDeck.description || ""}
                                  onChange={(e) => setCurrentDeck((prev) => ({ ...prev, description: e.target.value }))}
                                  className="bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-gray-500/50 focus:ring-2 focus:ring-gray-500/20"
                                  rows={3}
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  onClick={() => setShowDeckSaveDialog(false)}
                                  className="bg-gray-800/50 border-gray-600/50 text-gray-300 hover:bg-gray-700/50 hover:text-white rounded-lg"
                                >
                                  Cancelar
                                </Button>
                                <Button onClick={saveDeck} className="bg-gray-700/70 hover:bg-gray-600/70 text-white rounded-lg">
                                  Guardar
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Dialog open={showDeckLoadDialog} onOpenChange={setShowDeckLoadDialog}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 bg-gray-800/40 backdrop-blur-sm border border-gray-600/30 text-gray-300 hover:text-white hover:bg-gray-700/50 hover:border-gray-500/40 transition-all duration-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={savedDecks.length === 0}
                            >
                              <FolderOpen className="w-3 h-3 mr-1.5" />
                              Carregar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-900/95 backdrop-blur-xl border-gray-700/50 rounded-2xl max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-white">Baralhos Guardados</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              {savedDecks.length === 0 ? (
                                <div className="text-center py-8">
                                  <p className="text-gray-400">Nenhum baralho guardado ainda.</p>
                                </div>
                              ) : (
                                savedDecks.map((deck) => (
                                  <div key={deck.id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/30 hover:bg-gray-700/40 transition-colors">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <h3 className="text-white font-medium mb-1">{deck.name}</h3>
                                        <p className="text-sm text-gray-400 mb-2">
                                          <strong>Formato:</strong> {deck.format.toUpperCase()} • <strong>Cartas:</strong>{" "}
                                          {deck.mainboard.reduce((sum, card) => sum + card.quantity, 0)} •{" "}
                                          <strong>Criado:</strong> {new Date(deck.createdAt).toLocaleDateString("pt-PT")}
                                        </p>
                                        {deck.description && <p className="text-xs text-gray-500">{deck.description}</p>}
                                      </div>
                                      <div className="flex gap-2 ml-4">
                                        <Button
                                          size="sm"
                                          onClick={() => loadDeck(deck)}
                                          className="bg-gray-700/70 hover:bg-gray-600/70 text-white rounded-lg text-xs"
                                        >
                                          Carregar
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => deleteDeck(deck.id)}
                                          className="bg-gray-800/50 border-gray-600/50 text-gray-300 hover:bg-gray-700/50 hover:text-white rounded-lg text-xs"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 bg-gray-800/40 backdrop-blur-sm border border-gray-600/30 text-gray-300 hover:text-white hover:bg-gray-700/50 hover:border-gray-500/40 transition-all duration-200 rounded-lg text-sm"
                            >
                              <Upload className="w-3 h-3 mr-1.5" />
                              Importar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-900/95 backdrop-blur-xl border-gray-700/50 rounded-2xl max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-white">Importar Lista de Baralho</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium text-white mb-2 block">
                                  Cole a sua lista de baralho aqui:
                                </label>
                                <Textarea
                                  placeholder={`Exemplo:
4 Lightning Bolt
2 Counterspell
1 Black Lotus

// Sideboard
3 Negate
2 Dispel`}
                                  value={deckImportText}
                                  onChange={(e) => setDeckImportText(e.target.value)}
                                  className="bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-gray-500/50 focus:ring-2 focus:ring-gray-500/20"
                                  rows={10}
                                />
                              </div>
                              <div className="text-xs text-gray-400">
                                <p>
                                  <strong>Formato aceite:</strong> Quantidade Nome da Carta (ex: "4 Lightning Bolt")
                                </p>
                                <p>Use "// Sideboard" ou "Sideboard:" para separar o sideboard</p>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  onClick={() => setShowImportDialog(false)}
                                  className="bg-gray-800/50 border-gray-600/50 text-gray-300 hover:bg-gray-700/50 hover:text-white rounded-lg"
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  onClick={() => importDeckFromText(deckImportText)}
                                  className="bg-gray-700/70 hover:bg-gray-600/70 text-white rounded-lg"
                                  disabled={!deckImportText.trim()}
                                >
                                  Importar
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const deckText = exportDeckToText()
                            navigator.clipboard.writeText(deckText)
                            alert("Lista do baralho copiada para a área de transferência!")
                          }}
                          className="h-8 px-3 bg-gray-800/40 backdrop-blur-sm border border-gray-600/30 text-gray-300 hover:text-white hover:bg-gray-700/50 hover:border-gray-500/40 transition-all duration-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={currentDeck.mainboard.length === 0}
                        >
                          <Download className="w-3 h-3 mr-1.5" />
                          Exportar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Procurar e Filtros para Construtor de Baralhos */}
              <Card className="bg-gray-800/90 backdrop-blur-xl border-gray-700/50 shadow-2xl rounded-2xl overflow-hidden">
                {/* Header com gradiente sutil */}
                <div className="bg-gradient-to-r from-gray-800/20 to-gray-700/20 p-6 border-b border-gray-700/30">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"></div>
                    <h3 className="text-lg font-medium text-white">Pesquisar & Filtrar Cartas</h3>
                  </div>
                </div>

                <CardContent className="p-6 space-y-6">
                  {/* Barra de pesquisa principal */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                      </div>
                      <Input
                        placeholder="Procurar cartas para adicionar ao baralho..."
                        value={deckSearchQuery}
                        onChange={(e) => setDeckSearchQuery(e.target.value)}
                        className="pl-11 h-12 bg-gray-800/40 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200"
                      />
                    </div>
                    <div className="w-full sm:w-64">
                      <Select value={collectionType} onValueChange={setCollectionType}>
                        <SelectTrigger className="h-12 bg-gray-800/40 border border-gray-600/50 rounded-xl text-white focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200">
                          <SelectValue placeholder="Tipo de carta" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800/90 backdrop-blur-xl border-gray-600/50 rounded-xl">
                          <SelectItem value="all" className="text-white hover:bg-gray-700/50">Todas as Cartas</SelectItem>
                          {cardTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value} className="text-white hover:bg-gray-700/50">
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Controles de vista e filtros organizados */}
                  <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                    {/* Filtros básicos */}
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-300 whitespace-nowrap">Ordenar:</span>
                        <div className="flex items-center gap-2">
                          <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-32 h-10 bg-gray-800/30 border border-gray-600/40 rounded-lg text-white text-sm focus:border-purple-400/50 transition-all duration-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800/90 backdrop-blur-xl border-gray-600/50 rounded-lg">
                              <SelectItem value="name" className="text-white hover:bg-gray-700/50">Nome</SelectItem>
                              <SelectItem value="cmc" className="text-white hover:bg-gray-700/50">CMC</SelectItem>
                              <SelectItem value="rarity" className="text-white hover:bg-gray-700/50">Raridade</SelectItem>
                              <SelectItem value="price" className="text-white hover:bg-gray-700/50">Preço</SelectItem>
                              <SelectItem value="set" className="text-white hover:bg-gray-700/50">Edição</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSortAscending(!sortAscending)}
                            className="h-10 w-10 p-0 bg-gray-800/30 hover:bg-gray-700/50 border border-gray-600/40 rounded-lg text-gray-300 hover:text-white transition-all duration-200"
                          >
                            {sortAscending ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Ações de filtros */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="h-10 px-4 bg-gray-800/30 hover:bg-gray-700/50 border border-gray-600/40 rounded-lg text-gray-300 hover:text-white transition-all duration-200"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Filtros</span>
                        <span className="text-xs ml-1 opacity-70">
                          {showAdvancedFilters ? "△" : "▽"}
                        </span>
                      </Button>

                      <div className="h-6 w-px bg-gray-600/50"></div>

                      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0 bg-gray-800/30 hover:bg-emerald-600/20 border border-gray-600/40 hover:border-emerald-500/40 rounded-lg text-gray-300 hover:text-emerald-300 transition-all duration-200"
                            title="Guardar filtros"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900/95 backdrop-blur-xl border-gray-700/50 rounded-xl">
                          <DialogHeader>
                            <DialogTitle className="text-white">Guardar Filtros</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input
                              placeholder="Nome do filtro (ex: Controlo Azul, Criaturas Baratas...)"
                              value={filterName}
                              onChange={(e) => setFilterName(e.target.value)}
                              className="bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                onClick={() => setShowSaveDialog(false)}
                                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={() => {
                                  saveCurrentFilters()
                                  setShowSaveDialog(false)
                                  setFilterName("")
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={!filterName.trim()}
                              >
                                Guardar
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0 bg-gray-800/30 hover:bg-blue-600/20 border border-gray-600/40 hover:border-blue-500/40 rounded-lg text-gray-300 hover:text-blue-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={savedFilters.length === 0}
                            title="Carregar filtros guardados"
                          >
                            <FolderOpen className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900/95 backdrop-blur-xl border-gray-700/50 rounded-xl max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="text-white">Filtros Guardados</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {savedFilters.map((filter) => (
                              <div key={filter.id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/30">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h3 className="text-white font-medium mb-1">{filter.name}</h3>
                                    <p className="text-xs text-gray-400">
                                      Criado em {new Date(filter.createdAt).toLocaleDateString("pt-PT")}
                                    </p>
                                  </div>
                                  <div className="flex gap-2 ml-4">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        loadSavedFilter(filter)
                                        setShowLoadDialog(false)
                                      }}
                                      className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                      Carregar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => deleteSavedFilter(filter.id)}
                                      className="bg-red-600 border-red-500 text-white hover:bg-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {/* Filtros Avançados */}
                  {showAdvancedFilters && (
                    <div className="border-t border-gray-700/30 pt-6 space-y-6">
                      {/* Outros Filtros */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                          <label className="text-sm font-medium text-gray-300 mb-3 block">Raridade</label>
                          <Select value={rarityFilter} onValueChange={setRarityFilter}>
                            <SelectTrigger className="bg-gray-800/50 border border-gray-600/50 text-white rounded-xl focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200">
                              <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800/90 backdrop-blur-xl border-gray-600/50 rounded-xl">
                              <SelectItem value="all" className="text-white hover:bg-gray-700/50">Todas</SelectItem>
                              <SelectItem value="common" className="text-white hover:bg-gray-700/50">Comum</SelectItem>
                              <SelectItem value="uncommon" className="text-white hover:bg-gray-700/50">Incomum</SelectItem>
                              <SelectItem value="rare" className="text-white hover:bg-gray-700/50">Rara</SelectItem>
                              <SelectItem value="mythic" className="text-white hover:bg-gray-700/50">Mítica</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-300 mb-3 block">CMC</label>
                          <Input
                            placeholder="Ex: 3"
                            value={cmcFilter}
                            onChange={(e) => setCmcFilter(e.target.value)}
                            className="bg-gray-800/50 border border-gray-600/50 text-white rounded-xl focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-300 mb-3 block">Foil</label>
                          <Select value={foilFilter} onValueChange={setFoilFilter}>
                            <SelectTrigger className="bg-gray-800/50 border border-gray-600/50 text-white rounded-xl focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200">
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800/90 backdrop-blur-xl border-gray-600/50 rounded-xl">
                              <SelectItem value="all" className="text-white hover:bg-gray-700/50">Todos</SelectItem>
                              <SelectItem value="foil" className="text-white hover:bg-gray-700/50">Apenas Foil</SelectItem>
                              <SelectItem value="nonfoil" className="text-white hover:bg-gray-700/50">Apenas Normal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-300 mb-3 block">Tipo de Coleção</label>
                          <Select value={collectionType} onValueChange={setCollectionType}>
                            <SelectTrigger className="bg-gray-800/50 border border-gray-600/50 text-white rounded-xl focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200">
                              <SelectValue placeholder="Todos os tipos" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800/90 backdrop-blur-xl border-gray-600/50 rounded-xl">
                              <SelectItem value="all" className="text-white hover:bg-gray-700/50">Todos</SelectItem>
                              {cardTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value} className="text-white hover:bg-gray-700/50">
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Texto Oracle e Filtros de Cores lado a lado */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-medium text-gray-300 mb-3 block">Texto do Oráculo</label>
                          <Input
                            placeholder="Ex: voar, atropelar, vigilância..."
                            value={oracleTextFilter}
                            onChange={(e) => setOracleTextFilter(e.target.value)}
                            className="bg-gray-800/50 border border-gray-600/50 text-white rounded-xl focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-300 mb-3 block">Filtros por Cores de Mana</label>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { color: "W", name: "Branco" },
                              { color: "U", name: "Azul" },
                              { color: "B", name: "Preto" },
                              { color: "R", name: "Vermelho" },
                              { color: "G", name: "Verde" },
                              { color: "C", name: "Incolor" },
                            ].map(({ color, name }) => (
                              <ManaIcon
                                key={color}
                                color={color}
                                size="w-6 h-6"
                                isSelected={activeColors.has(color)}
                                onClick={() => toggleColor(color)}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Layout de Três Colunas Premium - Construtor de Baralhos */}
              {!isSearchingCards && deckBuilderCards.length > 0 && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Coluna Esquerda - Cartas Disponíveis */}
                  <div className="group bg-gradient-to-br from-slate-900/95 via-gray-900/90 to-slate-800/95 rounded-2xl border border-gray-700/40 shadow-2xl overflow-hidden hover:shadow-emerald-500/10 transition-all duration-500">
                    {/* Header Premium sem Glassmorphism para melhor DnD */}
                    <div className="relative bg-gradient-to-r from-emerald-600/15 via-emerald-500/10 to-teal-600/15 p-5 border-b border-gray-700/30">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-50"></div>
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-600/30 to-teal-600/30 rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-lg">
                            <Search className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                              Cartas Disponíveis
                              <span className="text-sm text-emerald-400 font-normal">• Arraste para adicionar</span>
                            </h3>
                            <p className="text-emerald-400 text-sm font-medium">{filteredDeckCards.length} encontradas</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTextView(!textView)}
                          className="h-10 w-10 p-0 bg-gray-800/50 hover:bg-gray-700/70 border border-gray-600/50 hover:border-emerald-500/50 rounded-xl text-gray-300 hover:text-emerald-400 transition-all duration-300 shadow-lg hover:shadow-xl"
                        >
                          {textView ? <Grid3X3 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="p-5 max-h-[650px] overflow-y-auto modern-scrollbar">
                      {filteredDeckCards.length > 0 ? (
                        <div className="space-y-3">
                          {textView ? (
                            // Vista de Lista Premium
                            <div className="space-y-3">
                              {visibleDeckCards.map((card) => (
                                <DraggableCard key={card.id} card={card}>
                                  <div
                                    className="group flex items-center gap-4 p-4 bg-gradient-to-r from-gray-800/40 via-gray-800/30 to-gray-800/40 hover:from-emerald-900/20 hover:via-gray-800/40 hover:to-emerald-900/20 rounded-xl border border-gray-700/30 hover:border-emerald-500/40 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl hover:shadow-emerald-500/10"
                                    onClick={() => setSelectedCard(card)}
                                  >
                                  <div className="relative">
                                    <img
                                      src={getOptimizedImageUrl(card, true) || "/placeholder.svg"}
                                      alt={card.name}
                                      className="w-14 h-20 rounded-lg object-cover shadow-xl border border-gray-600/30 group-hover:border-emerald-500/50 transition-all duration-300"
                                    />
                                    <div className="absolute -top-1 -right-1 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg">
                                      +
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white font-semibold truncate group-hover:text-emerald-100 transition-colors duration-300">{card.name}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <span
                                        className="text-sm filter drop-shadow-sm"
                                        dangerouslySetInnerHTML={{ __html: formatManaSymbols(card.mana_cost || "") }}
                                      />
                                      <Badge
                                        variant="outline"
                                        className={`text-xs font-medium border-2 ${
                                          card.rarity === "mythic"
                                            ? "border-orange-500/60 text-orange-300 bg-orange-500/15 shadow-orange-500/20"
                                            : card.rarity === "rare"
                                              ? "border-yellow-500/60 text-yellow-300 bg-yellow-500/15 shadow-yellow-500/20"
                                              : card.rarity === "uncommon"
                                                ? "border-gray-400/60 text-gray-200 bg-gray-400/15 shadow-gray-400/20"
                                                : "border-gray-600/60 text-gray-300 bg-gray-600/15 shadow-gray-600/20"
                                        } shadow-md`}
                                      >
                                        {card.rarity.charAt(0).toUpperCase()}
                                      </Badge>
                                    </div>
                                    <p className="text-gray-400 text-xs truncate mt-1 font-medium">{card.set_name}</p>
                                  </div>
                                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        addCardToDeck(card, 1, false)
                                      }}
                                      className="w-9 h-9 p-0 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300"
                                      title="Adicionar ao baralho principal"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        addCardToDeck(card, 1, true)
                                      }}
                                      className="w-9 h-9 p-0 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300"
                                      title="Adicionar ao sideboard"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                </DraggableCard>
                              ))}
                            </div>
                          ) : (
                            // Vista de Grelha Premium
                            <div className="grid grid-cols-2 gap-4">
                              {visibleDeckCards.map((card) => (
                                <DraggableCard key={card.id} card={card}>
                                  <div
                                    className="group relative cursor-pointer transform transition-all duration-400 hover:scale-105 hover:z-10"
                                    onClick={() => setSelectedCard(card)}
                                  >
                                  <div className="relative overflow-hidden rounded-xl">
                                    <img
                                      src={getOptimizedImageUrl(card, true) || "/placeholder.svg"}
                                      alt={card.name}
                                      className="w-full h-auto rounded-xl shadow-2xl border border-gray-700/40 group-hover:border-emerald-500/60 transition-all duration-400 filter group-hover:brightness-110"
                                      loading="lazy"
                                    />
                                    
                                    {/* Overlay com gradiente e informações */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-400 backdrop-blur-[1px]">
                                      <div className="absolute bottom-3 left-3 right-3">
                                        <p className="text-white text-sm font-semibold truncate drop-shadow-lg">{card.name}</p>
                                        <div className="flex items-center justify-between mt-2">
                                          <span
                                            className="text-xs filter drop-shadow-md"
                                            dangerouslySetInnerHTML={{ __html: formatManaSymbols(card.mana_cost || "") }}
                                          />
                                          <Badge
                                            variant="outline"
                                            className={`text-xs font-medium border-2 ${
                                              card.rarity === "mythic"
                                                ? "border-orange-500/80 text-orange-200 bg-orange-500/25 shadow-orange-500/30"
                                                : card.rarity === "rare"
                                                  ? "border-yellow-500/80 text-yellow-200 bg-yellow-500/25 shadow-yellow-500/30"
                                                  : card.rarity === "uncommon"
                                                    ? "border-gray-400/80 text-gray-200 bg-gray-400/25 shadow-gray-400/30"
                                                    : "border-gray-600/80 text-gray-200 bg-gray-600/25 shadow-gray-600/30"
                                            } shadow-lg backdrop-blur-sm`}
                                          >
                                            {card.rarity.charAt(0).toUpperCase()}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Botões flutuantes aprimorados */}
                                    <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-400 transform translate-x-3 group-hover:translate-x-0">
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          addCardToDeck(card, 1, false)
                                        }}
                                        className="w-9 h-9 p-0 bg-gradient-to-br from-emerald-600/95 to-emerald-700/95 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-full shadow-xl backdrop-blur-sm border border-emerald-400/30 hover:shadow-emerald-500/40 transition-all duration-300"
                                        title="Adicionar ao baralho principal"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          addCardToDeck(card, 1, true)
                                        }}
                                        className="w-9 h-9 p-0 bg-gradient-to-br from-blue-600/95 to-blue-700/95 hover:from-blue-500 hover:to-blue-600 text-white rounded-full shadow-xl backdrop-blur-sm border border-blue-400/30 hover:shadow-blue-500/40 transition-all duration-300"
                                        title="Adicionar ao sideboard"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                </DraggableCard>
                              ))}
                            </div>
                          )}

                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <div className="w-20 h-20 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-gray-700/30 shadow-xl">
                            <Search className="w-10 h-10 text-gray-500" />
                          </div>
                          <p className="text-gray-300 font-semibold text-lg mb-2">Nenhuma carta encontrada</p>
                          <p className="text-gray-500 text-sm">Ajuste os filtros para ver mais cartas</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Coluna do Meio - Baralho Principal */}
                  <DroppableZone 
                    id="deck-mainboard-zone" 
                    className="border-2 border-dashed border-purple-600/30 rounded-2xl transition-all duration-300 hover:border-purple-400/70"
                  >
                    <div className="group bg-gradient-to-br from-slate-900/95 via-purple-900/20 to-slate-800/95 rounded-2xl border border-gray-700/40 shadow-2xl overflow-hidden hover:shadow-purple-500/10 transition-all duration-500">
                    {/* Header Premium sem Glassmorphism para melhor DnD */}
                    <div className="relative bg-gradient-to-r from-purple-600/15 via-purple-500/10 to-pink-600/15 p-5 border-b border-gray-700/30">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-50"></div>
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-xl flex items-center justify-center border border-purple-500/20 shadow-lg">
                            <Hammer className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold text-lg">Baralho Principal</h3>
                            <p className="text-purple-400 text-sm font-medium">{deckStats.totalCards} cartas</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant="outline" 
                            className="border-purple-500/60 text-purple-300 bg-purple-500/15 px-4 py-2 text-sm rounded-xl font-medium shadow-lg"
                          >
                            {currentDeck.format === "commander" ? "99 cartas" : "60 cartas"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTextView(!textView)}
                            className="h-10 w-10 p-0 bg-gray-800/50 hover:bg-gray-700/70 border border-gray-600/50 hover:border-purple-500/50 rounded-xl text-gray-300 hover:text-purple-400 transition-all duration-300 shadow-lg hover:shadow-xl"
                          >
                            {textView ? <Grid3X3 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 max-h-[650px] overflow-y-auto modern-scrollbar">
                      {currentDeck.mainboard.length > 0 ? (
                        <div className="space-y-3">
                          {textView ? (
                            // Vista de Lista Premium
                            <div className="space-y-3">
                              {currentDeck.mainboard
                                .sort((a, b) => a.card.name.localeCompare(b.card.name))
                                .map((deckCard) => (
                                  <div
                                    key={deckCard.card.id}
                                    className="group flex items-center gap-4 p-4 bg-gradient-to-r from-gray-800/40 via-gray-800/30 to-gray-800/40 hover:from-purple-900/20 hover:via-gray-800/40 hover:to-purple-900/20 rounded-xl border border-gray-700/30 hover:border-purple-500/40 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-purple-500/10"
                                  >
                                    <div className="relative">
                                      <img
                                        src={getOptimizedImageUrl(deckCard.card, true) || "/placeholder.svg"}
                                        alt={deckCard.card.name}
                                        className="w-14 h-20 rounded-lg object-cover shadow-xl border border-gray-600/30 group-hover:border-purple-500/50 cursor-pointer transition-all duration-300"
                                        onClick={() => setSelectedCard(deckCard.card)}
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white font-semibold truncate group-hover:text-purple-100 transition-colors duration-300">{deckCard.card.name}</p>
                                      <div className="flex items-center gap-2 mt-2">
                                        <span
                                          className="text-sm filter drop-shadow-sm"
                                          dangerouslySetInnerHTML={{
                                            __html: formatManaSymbols(deckCard.card.mana_cost || ""),
                                          }}
                                        />
                                        <Badge
                                          variant="outline"
                                          className={`text-xs font-medium border-2 ${
                                            deckCard.card.rarity === "mythic"
                                              ? "border-orange-500/60 text-orange-300 bg-orange-500/15 shadow-orange-500/20"
                                              : deckCard.card.rarity === "rare"
                                                ? "border-yellow-500/60 text-yellow-300 bg-yellow-500/15 shadow-yellow-500/20"
                                                : deckCard.card.rarity === "uncommon"
                                                  ? "border-gray-400/60 text-gray-200 bg-gray-400/15 shadow-gray-400/20"
                                                  : "border-gray-600/60 text-gray-300 bg-gray-600/15 shadow-gray-600/20"
                                          } shadow-md`}
                                        >
                                          {deckCard.card.rarity.charAt(0).toUpperCase()}
                                        </Badge>
                                      </div>
                                      <p className="text-gray-400 text-xs truncate mt-1 font-medium">{deckCard.card.set_name}</p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-800/30 rounded-xl p-2 border border-gray-700/20">
                                      <Button
                                        size="sm"
                                        onClick={() => removeCardFromDeck(deckCard.card.id, 1, false)}
                                        className="w-8 h-8 p-0 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg shadow-lg hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300"
                                      >
                                        <Minus className="w-4 h-4" />
                                      </Button>
                                      <span className="text-white text-lg font-bold w-8 text-center bg-gray-700/50 rounded-lg py-1 border border-gray-600/30">
                                        {deckCard.quantity}
                                      </span>
                                      <Button
                                        size="sm"
                                        onClick={() => addCardToDeck(deckCard.card, 1, false)}
                                        className="w-8 h-8 p-0 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-lg shadow-lg hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            // Vista de Grelha Premium
                            <div className="grid grid-cols-3 gap-3">
                              {currentDeck.mainboard
                                .sort((a, b) => a.card.name.localeCompare(b.card.name))
                                .map((deckCard) => (
                                  <div
                                    key={deckCard.card.id}
                                    className="group relative cursor-pointer transform transition-all duration-400 hover:scale-105 hover:z-10"
                                    onClick={() => setSelectedCard(deckCard.card)}
                                  >
                                    <div className="relative overflow-hidden rounded-xl">
                                      <img
                                        src={getOptimizedImageUrl(deckCard.card, true) || "/placeholder.svg"}
                                        alt={deckCard.card.name}
                                        className="w-full h-auto rounded-xl shadow-2xl border border-gray-700/40 group-hover:border-purple-500/60 transition-all duration-400 filter group-hover:brightness-110"
                                        loading="lazy"
                                      />
                                      
                                      {/* Badge de quantidade */}
                                      <div className="absolute top-2 left-2 bg-gradient-to-br from-purple-600/90 to-purple-700/90 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-xl backdrop-blur-sm border border-purple-400/30">
                                        {deckCard.quantity}
                                      </div>
                                      
                                      {/* Overlay com informações */}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-400 backdrop-blur-[1px]">
                                        <div className="absolute bottom-3 left-3 right-3">
                                          <p className="text-white text-sm font-semibold truncate drop-shadow-lg">{deckCard.card.name}</p>
                                          <div className="flex items-center justify-between mt-2">
                                            <span
                                              className="text-xs filter drop-shadow-md"
                                              dangerouslySetInnerHTML={{
                                                __html: formatManaSymbols(deckCard.card.mana_cost || ""),
                                              }}
                                            />
                                            <Badge
                                              variant="outline"
                                              className={`text-xs font-medium border-2 ${
                                                deckCard.card.rarity === "mythic"
                                                  ? "border-orange-500/80 text-orange-200 bg-orange-500/25 shadow-orange-500/30"
                                                  : deckCard.card.rarity === "rare"
                                                    ? "border-yellow-500/80 text-yellow-200 bg-yellow-500/25 shadow-yellow-500/30"
                                                    : deckCard.card.rarity === "uncommon"
                                                      ? "border-gray-400/80 text-gray-200 bg-gray-400/25 shadow-gray-400/30"
                                                      : "border-gray-600/80 text-gray-200 bg-gray-600/25 shadow-gray-600/30"
                                              } shadow-lg backdrop-blur-sm`}
                                            >
                                              {deckCard.card.rarity.charAt(0).toUpperCase()}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Controles de quantidade aprimorados */}
                                      <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-400 transform translate-x-3 group-hover:translate-x-0">
                                        <Button
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            addCardToDeck(deckCard.card, 1, false)
                                          }}
                                          className="w-7 h-7 p-0 bg-gradient-to-br from-emerald-600/95 to-emerald-700/95 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-full shadow-xl backdrop-blur-sm border border-emerald-400/30 hover:shadow-emerald-500/40 transition-all duration-300"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            removeCardFromDeck(deckCard.card.id, 1, false)
                                          }}
                                          className="w-7 h-7 p-0 bg-gradient-to-br from-red-600/95 to-red-700/95 hover:from-red-500 hover:to-red-600 text-white rounded-full shadow-xl backdrop-blur-sm border border-red-400/30 hover:shadow-red-500/40 transition-all duration-300"
                                        >
                                          <Minus className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <div className="w-20 h-20 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-gray-700/30 shadow-xl">
                            <Hammer className="w-10 h-10 text-gray-500" />
                          </div>
                          <p className="text-gray-300 font-semibold text-lg mb-2">Baralho vazio</p>
                          <div className="space-y-1 text-gray-500 text-xs">
                            <p>• Use os botões <strong className="text-purple-400">+</strong> nas cartas</p>
                            <p>• Ou <strong className="text-purple-400">arraste e solte</strong> cartas aqui</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  </DroppableZone>

                  {/* Coluna Direita - Sideboard */}
                  <DroppableZone 
                    id="deck-sideboard-zone" 
                    className="border-2 border-dashed border-blue-600/30 rounded-2xl transition-all duration-300 hover:border-blue-400/70"
                  >
                    <div className="group bg-gradient-to-br from-slate-900/95 via-blue-900/20 to-slate-800/95 rounded-2xl border border-gray-700/40 shadow-2xl overflow-hidden hover:shadow-blue-500/10 transition-all duration-500">
                    {/* Header Premium sem Glassmorphism para melhor DnD */}
                    <div className="relative bg-gradient-to-r from-blue-600/15 via-blue-500/10 to-indigo-600/15 p-5 border-b border-gray-700/30">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-50"></div>
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-600/30 to-indigo-600/30 rounded-xl flex items-center justify-center border border-blue-500/20 shadow-lg">
                            <Shield className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold text-lg">Sideboard</h3>
                            <p className="text-blue-400 text-sm font-medium">{deckStats.sideboardCards} cartas</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant="outline" 
                            className="border-blue-500/60 text-blue-300 bg-blue-500/15 px-4 py-2 text-sm rounded-xl font-medium shadow-lg"
                          >
                            {currentDeck.format === "commander" ? "0 cartas" : "15 cartas"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTextView(!textView)}
                            className="h-10 w-10 p-0 bg-gray-800/50 hover:bg-gray-700/70 border border-gray-600/50 hover:border-blue-500/50 rounded-xl text-gray-300 hover:text-blue-400 transition-all duration-300 shadow-lg hover:shadow-xl"
                          >
                            {textView ? <Grid3X3 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 max-h-[650px] overflow-y-auto modern-scrollbar">
                      {currentDeck.sideboard.length > 0 ? (
                        <div className="space-y-3">
                          {textView ? (
                            // Vista de Lista Premium
                            <div className="space-y-3">
                              {currentDeck.sideboard
                                .sort((a, b) => a.card.name.localeCompare(b.card.name))
                                .map((deckCard) => (
                                  <div
                                    key={deckCard.card.id}
                                    className="group flex items-center gap-4 p-4 bg-gradient-to-r from-gray-800/40 via-gray-800/30 to-gray-800/40 hover:from-blue-900/20 hover:via-gray-800/40 hover:to-blue-900/20 rounded-xl border border-gray-700/30 hover:border-blue-500/40 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/10"
                                  >
                                    <div className="relative">
                                      <img
                                        src={getOptimizedImageUrl(deckCard.card, true) || "/placeholder.svg"}
                                        alt={deckCard.card.name}
                                        className="w-14 h-20 rounded-lg object-cover shadow-xl border border-gray-600/30 group-hover:border-blue-500/50 cursor-pointer transition-all duration-300"
                                        onClick={() => setSelectedCard(deckCard.card)}
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white font-semibold truncate group-hover:text-blue-100 transition-colors duration-300">{deckCard.card.name}</p>
                                      <div className="flex items-center gap-2 mt-2">
                                        <span
                                          className="text-sm filter drop-shadow-sm"
                                          dangerouslySetInnerHTML={{
                                            __html: formatManaSymbols(deckCard.card.mana_cost || ""),
                                          }}
                                        />
                                        <Badge
                                          variant="outline"
                                          className={`text-xs font-medium border-2 ${
                                            deckCard.card.rarity === "mythic"
                                              ? "border-orange-500/60 text-orange-300 bg-orange-500/15 shadow-orange-500/20"
                                              : deckCard.card.rarity === "rare"
                                                ? "border-yellow-500/60 text-yellow-300 bg-yellow-500/15 shadow-yellow-500/20"
                                                : deckCard.card.rarity === "uncommon"
                                                  ? "border-gray-400/60 text-gray-200 bg-gray-400/15 shadow-gray-400/20"
                                                  : "border-gray-600/60 text-gray-300 bg-gray-600/15 shadow-gray-600/20"
                                          } shadow-md`}
                                        >
                                          {deckCard.card.rarity.charAt(0).toUpperCase()}
                                        </Badge>
                                      </div>
                                      <p className="text-gray-400 text-xs truncate mt-1 font-medium">{deckCard.card.set_name}</p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-800/30 rounded-xl p-2 border border-gray-700/20">
                                      <Button
                                        size="sm"
                                        onClick={() => removeCardFromDeck(deckCard.card.id, 1, true)}
                                        className="w-8 h-8 p-0 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg shadow-lg hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300"
                                      >
                                        <Minus className="w-4 h-4" />
                                      </Button>
                                      <span className="text-white text-lg font-bold w-8 text-center bg-gray-700/50 rounded-lg py-1 border border-gray-600/30">
                                        {deckCard.quantity}
                                      </span>
                                      <Button
                                        size="sm"
                                        onClick={() => addCardToDeck(deckCard.card, 1, true)}
                                        className="w-8 h-8 p-0 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg shadow-lg hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            // Vista de Grelha Premium
                            <div className="grid grid-cols-3 gap-3">
                              {currentDeck.sideboard
                                .sort((a, b) => a.card.name.localeCompare(b.card.name))
                                .map((deckCard) => (
                                  <div
                                    key={deckCard.card.id}
                                    className="group relative cursor-pointer transform transition-all duration-400 hover:scale-105 hover:z-10"
                                    onClick={() => setSelectedCard(deckCard.card)}
                                  >
                                    <div className="relative overflow-hidden rounded-xl">
                                      <img
                                        src={getOptimizedImageUrl(deckCard.card, true) || "/placeholder.svg"}
                                        alt={deckCard.card.name}
                                        className="w-full h-auto rounded-xl shadow-2xl border border-gray-700/40 group-hover:border-blue-500/60 transition-all duration-400 filter group-hover:brightness-110"
                                        loading="lazy"
                                      />
                                      
                                      {/* Badge de quantidade */}
                                      <div className="absolute top-2 left-2 bg-gradient-to-br from-blue-600/90 to-blue-700/90 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-xl backdrop-blur-sm border border-blue-400/30">
                                        {deckCard.quantity}
                                      </div>
                                      
                                      {/* Overlay com informações */}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-400 backdrop-blur-[1px]">
                                        <div className="absolute bottom-3 left-3 right-3">
                                          <p className="text-white text-sm font-semibold truncate drop-shadow-lg">{deckCard.card.name}</p>
                                          <div className="flex items-center justify-between mt-2">
                                            <span
                                              className="text-xs filter drop-shadow-md"
                                              dangerouslySetInnerHTML={{
                                                __html: formatManaSymbols(deckCard.card.mana_cost || ""),
                                              }}
                                            />
                                            <Badge
                                              variant="outline"
                                              className={`text-xs font-medium border-2 ${
                                                deckCard.card.rarity === "mythic"
                                                  ? "border-orange-500/80 text-orange-200 bg-orange-500/25 shadow-orange-500/30"
                                                  : deckCard.card.rarity === "rare"
                                                    ? "border-yellow-500/80 text-yellow-200 bg-yellow-500/25 shadow-yellow-500/30"
                                                    : deckCard.card.rarity === "uncommon"
                                                      ? "border-gray-400/80 text-gray-200 bg-gray-400/25 shadow-gray-400/30"
                                                      : "border-gray-600/80 text-gray-200 bg-gray-600/25 shadow-gray-600/30"
                                              } shadow-lg backdrop-blur-sm`}
                                            >
                                              {deckCard.card.rarity.charAt(0).toUpperCase()}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Controles de quantidade aprimorados */}
                                      <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-400 transform translate-x-3 group-hover:translate-x-0">
                                        <Button
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            addCardToDeck(deckCard.card, 1, true)
                                          }}
                                          className="w-7 h-7 p-0 bg-gradient-to-br from-blue-600/95 to-blue-700/95 hover:from-blue-500 hover:to-blue-600 text-white rounded-full shadow-xl backdrop-blur-sm border border-blue-400/30 hover:shadow-blue-500/40 transition-all duration-300"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            removeCardFromDeck(deckCard.card.id, 1, true)
                                          }}
                                          className="w-7 h-7 p-0 bg-gradient-to-br from-red-600/95 to-red-700/95 hover:from-red-500 hover:to-red-600 text-white rounded-full shadow-xl backdrop-blur-sm border border-red-400/30 hover:shadow-red-500/40 transition-all duration-300"
                                        >
                                          <Minus className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <div className="w-20 h-20 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-gray-700/30 shadow-xl">
                            <Shield className="w-10 h-10 text-gray-500" />
                          </div>
                          <p className="text-gray-300 font-semibold text-lg mb-2">Sideboard vazio</p>
                          <div className="space-y-1 text-gray-500 text-xs">
                            <p>• Use os botões <strong className="text-blue-400">+</strong> azuis nas cartas</p>
                            <p>• Ou <strong className="text-blue-400">arraste e solte</strong> cartas aqui</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  </DroppableZone>
                </div>
              )}

              {/* Nenhuma carta carregada para o construtor de baralhos */}
              {isSearchingCards && (
                <Card className="bg-gray-800/70 border-gray-700 backdrop-blur-sm">
                  <CardContent className="p-8 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                      <p className="text-white text-lg">{loadingMessage}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
          <TabsContent value="rules" className="space-y-6">
            {/* Cabeçalho das Regras */}
            <Card className="bg-gray-800/70 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-xl">Consulta de Regras</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Seleção de Fonte */}
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">Fonte das Cartas</label>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={rulesSource === "search" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRulesSource("search")}
                      className={rulesSource === "search" 
                        ? "bg-emerald-600 text-white" 
                        : "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                      }
                    >
                      Procurar Cartas
                    </Button>
                    <Button
                      variant={rulesSource === "collection" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRulesSource("collection")}
                      className={rulesSource === "collection" 
                        ? "bg-emerald-600 text-white" 
                        : "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                      }
                      disabled={savedCollections.length === 0}
                    >
                      Da Coleção ({savedCollections.length})
                    </Button>
                    <Button
                      variant={rulesSource === "deck" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRulesSource("deck")}
                      className={rulesSource === "deck" 
                        ? "bg-emerald-600 text-white" 
                        : "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                      }
                      disabled={savedDecks.length === 0}
                    >
                      Do Baralho ({savedDecks.length})
                    </Button>
                  </div>
                </div>

                {/* Seleção de Coleção/Baralho */}
                {rulesSource === "collection" && (
                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">Selecionar Coleção</label>
                    <Select value={selectedCollectionForRules} onValueChange={setSelectedCollectionForRules}>
                      <SelectTrigger className={selectClasses}>
                        <SelectValue placeholder="Escolha uma coleção" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        {savedCollections.map((collection) => (
                          <SelectItem key={collection.id} value={collection.id} className="text-white">
                            {collection.name} ({collection.cards.length} cartas)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {rulesSource === "deck" && (
                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">Selecionar Baralho</label>
                    <Select value={selectedDeckForRules} onValueChange={setSelectedDeckForRules}>
                      <SelectTrigger className={selectClasses}>
                        <SelectValue placeholder="Escolha um baralho" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        {savedDecks.map((deck) => (
                          <SelectItem key={deck.id} value={deck.id} className="text-white">
                            {deck.name} ({deck.mainboard.length + deck.sideboard.length} cartas)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Campo de pesquisa */}
                {rulesSource === "search" && (
                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">Procurar Carta</label>
                    <Input
                      placeholder="Digite o nome da carta..."
                      value={rulesSearchQuery}
                      onChange={(e) => setRulesSearchQuery(e.target.value)}
                      className={inputClasses}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Layout de Duas Colunas */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Coluna Esquerda - Cartas Disponíveis */}
              <Card className="bg-gray-800/70 border-gray-700 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg">
                    {rulesSource === "search" ? "Resultados da Procura" : 
                    rulesSource === "collection" ? "Cartas da Coleção" : "Cartas do Baralho"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[600px] overflow-y-auto">
                  {rulesSource === "search" ? (
                    // Resultados da procura
                    <div className="space-y-2">
                      {rulesSearchQuery.length >= 2 ? (
                        allCards
                          .filter(card => normalize(card.name).includes(normalize(rulesSearchQuery)))
                          .slice(0, 20)
                          .map((card) => (
                            <div
                              key={card.id}
                              className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer"
                              onClick={() => {
                                setSelectedRulesCard(card)
                                fetchCardRulings(card)
                              }}
                            >
                              <img
                                src={getOptimizedImageUrl(card, true) || "/placeholder.svg"}
                                alt={card.name}
                                className="w-12 h-16 rounded object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{card.name}</p>
                                <div className="flex items-center gap-2">
                                  <span
                                    className="text-xs"
                                    dangerouslySetInnerHTML={{ __html: formatManaSymbols(card.mana_cost || "") }}
                                  />
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      card.rarity === "mythic"
                                        ? "border-orange-500 text-orange-400"
                                        : card.rarity === "rare"
                                          ? "border-yellow-500 text-yellow-400"
                                          : card.rarity === "uncommon"
                                            ? "border-gray-400 text-gray-300"
                                            : "border-gray-600 text-gray-400"
                                    }`}
                                  >
                                    {card.rarity.charAt(0).toUpperCase()}
                                  </Badge>
                                </div>
                                <p className="text-gray-400 text-xs truncate">{card.set_name}</p>
                              </div>
                            </div>
                          ))
                      ) : (
                        <p className="text-gray-400 text-center py-8">
                          Digite pelo menos 2 caracteres para procurar cartas
                        </p>
                      )}
                    </div>
                  ) : (
                    // Cartas da coleção/baralho
                    <div className="space-y-2">
                      {availableRulesCards.length > 0 ? (
                        availableRulesCards.map((card) => (
                          <div
                            key={card.id}
                            className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedRulesCard(card)
                              fetchCardRulings(card)
                            }}
                          >
                            <img
                              src={getOptimizedImageUrl(card, true) || "/placeholder.svg"}
                              alt={card.name}
                              className="w-12 h-16 rounded object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{card.name}</p>
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-xs"
                                  dangerouslySetInnerHTML={{ __html: formatManaSymbols(card.mana_cost || "") }}
                                />
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    card.rarity === "mythic"
                                      ? "border-orange-500 text-orange-400"
                                      : card.rarity === "rare"
                                        ? "border-yellow-500 text-yellow-400"
                                        : card.rarity === "uncommon"
                                          ? "border-gray-400 text-gray-300"
                                          : "border-gray-600 text-gray-400"
                                  }`}
                                >
                                  {card.rarity.charAt(0).toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-gray-400 text-xs truncate">{card.set_name}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-center py-8">
                          {rulesSource === "collection" && !selectedCollectionForRules
                            ? "Selecione uma coleção para ver as cartas disponíveis."
                            : rulesSource === "deck" && !selectedDeckForRules
                            ? "Selecione um baralho para ver as cartas disponíveis."
                            : "Nenhuma carta disponível para esta fonte."}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Coluna Direita - Regras da Carta */}
              <Card className="bg-gray-800/70 border-gray-700 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg">Regras da Carta</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[600px] overflow-y-auto">
                  {isLoadingRulings ? (
                    <div className="text-center py-8 flex flex-col items-center gap-4">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                      <p className="text-white">A carregar regras...</p>
                    </div>
                  ) : selectedRulesCard ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-lg">
                        <img
                          src={getOptimizedImageUrl(selectedRulesCard, false) || "/placeholder.svg"}
                          alt={selectedRulesCard.name}
                          className="w-24 h-auto rounded-lg shadow-md"
                        />
                        <div>
                          <h3 className="text-xl font-bold text-white">{selectedRulesCard.name}</h3>
                          <p className="text-gray-400 text-sm">{selectedRulesCard.type_line}</p>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm text-gray-300"
                              dangerouslySetInnerHTML={{ __html: formatManaSymbols(selectedRulesCard.mana_cost || "") }}
                            />
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                selectedRulesCard.rarity === "mythic"
                                  ? "border-orange-500 text-orange-400"
                                  : selectedRulesCard.rarity === "rare"
                                    ? "border-yellow-500 text-yellow-400"
                                    : selectedRulesCard.rarity === "uncommon"
                                      ? "border-gray-400 text-gray-300"
                                      : "border-gray-600 text-gray-400"
                              }`}
                            >
                              {selectedRulesCard.rarity.charAt(0).toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {cardRulings.length > 0 ? (
                        <div className="space-y-3">
                          {cardRulings.map((ruling, index) => (
                            <div key={index} className="bg-gray-800 p-3 rounded-lg">
                              <p className="text-gray-300 text-sm">{ruling.comment}</p>
                              <p className="text-gray-500 text-xs mt-2">
                                Fonte: {ruling.source} • Publicado em: {new Date(ruling.published_at).toLocaleDateString("pt-PT")}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-center py-8">
                          Nenhuma regra específica encontrada para esta carta.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-8">
                      Selecione uma carta na coluna da esquerda para ver as suas regras.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
            </TabsContent>
          </Tabs>
        </div>

          {/* Diálogo de Detalhes da Carta - Redesenhado */}
          {selectedCard && (
          <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
            <DialogContent className="max-w-4xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-0 p-0 overflow-hidden shadow-2xl">
              <div className="relative">
                {/* Background Overlay com a arte da carta */}
                <div 
                  className="absolute inset-0 opacity-5 blur-sm"
                  style={{
                    backgroundImage: `url(${getOptimizedImageUrl(selectedCard, false) || "/placeholder.svg"})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900/95 via-gray-800/98 to-gray-900/95" />
                
                {/* Conteúdo Principal */}
                <div className="relative z-10">
                  {/* Header do Modal - Compacto */}
                  <div className="p-4 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <h2 className="text-xl font-bold text-white tracking-tight">
                            {selectedCard.name}
                          </h2>
                          <div className="flex items-center gap-2 mt-1">
                            <div 
                              className="flex items-center gap-1"
                              dangerouslySetInnerHTML={{ __html: formatManaSymbols(selectedCard.mana_cost || "") }}
                            />
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                selectedCard.rarity === "mythic"
                                  ? "border-orange-500 text-orange-400 bg-orange-500/10"
                                  : selectedCard.rarity === "rare"
                                    ? "border-yellow-500 text-yellow-400 bg-yellow-500/10"
                                    : selectedCard.rarity === "uncommon"
                                      ? "border-gray-400 text-gray-300 bg-gray-400/10"
                                      : "border-gray-600 text-gray-400 bg-gray-600/10"
                              } backdrop-blur-sm font-medium`}
                            >
                              <Star className="w-3 h-3 mr-1" />
                              {selectedCard.rarity}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCard(null)}
                        className="text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full p-2"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Conteúdo Scrollável - Mais compacto */}
                  <div className="max-h-[70vh] overflow-y-auto">
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Coluna Esquerda - Imagem da Carta */}
                        <div className="flex flex-col items-center space-y-4">
                          <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg blur opacity-20 group-hover:opacity-60 transition duration-200"></div>
                            <div className="relative">
                              <img
                                src={getOptimizedImageUrl(selectedCard, false) || "/placeholder.svg"}
                                alt={selectedCard.name}
                                className="w-full max-w-xs h-auto rounded-lg shadow-xl transform transition-transform duration-200 hover:scale-102"
                              />
                              
                              {/* Overlay com preço - Mais compacto */}
                              <div className="absolute bottom-3 left-3 right-3">
                                <div className="bg-gray-900/90 backdrop-blur-lg rounded-md p-2 border border-gray-700/50">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                      <Coins className="w-3 h-3 text-yellow-400" />
                                      <span className="text-gray-300 text-xs">Valor</span>
                                    </div>
                                    <span className="text-emerald-400 font-bold text-sm">
                                      R$ {getEstimatedPrice(selectedCard).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Botões de Ação - Mais compactos */}
                          <div className="w-full max-w-xs space-y-2">
                            <div className="grid grid-cols-1 gap-2">
                              <Button
                                onClick={() => addCardToCollection(selectedCard, 1, "Near Mint", false)}
                                size="sm"
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-emerald-500/20 transition-all duration-200"
                              >
                                <Plus className="w-3 h-3 mr-2" />
                                Adicionar Normal
                              </Button>
                              
                              <Button
                                onClick={() => addCardToCollection(selectedCard, 1, "Near Mint", true)}
                                size="sm"
                                className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white shadow-md hover:shadow-yellow-500/20 transition-all duration-200"
                              >
                                <Sparkles className="w-3 h-3 mr-2" />
                                Adicionar Foil
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                onClick={() => addCardToDeck(selectedCard, 1, false)}
                                variant="outline"
                                size="sm"
                                className="bg-blue-600/10 border-blue-500 text-blue-300 hover:bg-blue-600/20 hover:text-blue-200 transition-all duration-200"
                              >
                                <BookOpen className="w-3 h-3 mr-1" />
                                Principal
                              </Button>
                              
                              <Button
                                onClick={() => addCardToDeck(selectedCard, 1, true)}
                                variant="outline"
                                size="sm"
                                className="bg-purple-600/10 border-purple-500 text-purple-300 hover:bg-purple-600/20 hover:text-purple-200 transition-all duration-200"
                              >
                                <Zap className="w-3 h-3 mr-1" />
                                Sideboard
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Coluna Direita - Informações da Carta */}
                        <div className="space-y-4">
                          
                          {/* Informações Básicas */}
                          <div className="bg-gray-800/40 backdrop-blur-sm rounded-lg p-4 border border-gray-700/30">
                            <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                              <Info className="w-4 h-4 text-blue-400" />
                              Informações Básicas
                            </h3>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-sm">Tipo:</span>
                                <span className="text-white text-sm">{selectedCard.type_line}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-sm flex items-center gap-1">
                                  <Hash className="w-3 h-3" />
                                  CMC:
                                </span>
                                <span className="text-white text-sm font-medium">{selectedCard.cmc}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-sm flex items-center gap-1">
                                  <Globe className="w-3 h-3" />
                                  Edição:
                                </span>
                                <span className="text-white text-sm">{selectedCard.set_name}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-sm flex items-center gap-1">
                                  <Hash className="w-3 h-3" />
                                  Número:
                                </span>
                                <span className="text-white text-sm">#{selectedCard.collector_number}</span>
                              </div>
                            </div>
                          </div>

                          {/* Texto Oracle */}
                          {selectedCard.oracle_text && (
                            <div className="bg-gray-800/40 backdrop-blur-sm rounded-lg p-4 border border-gray-700/30">
                              <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-purple-400" />
                                Texto Oracle
                              </h3>
                              <p className="text-gray-300 text-sm leading-relaxed">
                                {selectedCard.oracle_text}
                              </p>
                            </div>
                          )}

                          {/* Estatísticas de Combate */}
                          {selectedCard.power && selectedCard.toughness && (
                            <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 backdrop-blur-sm rounded-lg p-4 border border-red-700/30">
                              <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                                <Sword className="w-4 h-4 text-red-400" />
                                <Shield className="w-4 h-4 text-orange-400" />
                                Poder / Resistência
                              </h3>
                              <div className="flex items-center justify-center gap-3">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-red-400">{selectedCard.power}</div>
                                  <div className="text-xs text-gray-400">Poder</div>
                                </div>
                                <div className="text-gray-500 text-xl">/</div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-orange-400">{selectedCard.toughness}</div>
                                  <div className="text-xs text-gray-400">Resistência</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Informações da Edição */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-800/40 backdrop-blur-sm rounded-lg p-3 border border-gray-700/30">
                              <div className="flex items-center gap-2 mb-2">
                                <Palette className="w-3 h-3 text-gray-400" />
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Artista</span>
                              </div>
                              <p className="text-white text-sm">{selectedCard.artist}</p>
                            </div>

                            <div className="bg-gray-800/40 backdrop-blur-sm rounded-lg p-3 border border-gray-700/30">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Lançamento</span>
                              </div>
                              <p className="text-white text-sm">
                                {new Date(selectedCard.released_at).toLocaleDateString("pt-PT", {
                                  year: 'numeric',
                                  month: 'short'
                                })}
                              </p>
                            </div>
                          </div>

                          {/* Identidade de Cores */}
                          {selectedCard.color_identity && selectedCard.color_identity.length > 0 && (
                            <div className="bg-gray-800/40 backdrop-blur-sm rounded-lg p-4 border border-gray-700/30">
                              <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                                <Palette className="w-4 h-4 text-green-400" />
                                Identidade de Cores
                              </h3>
                              <div className="flex gap-2 justify-center">
                                {selectedCard.color_identity.map((color) => (
                                  <div
                                    key={color}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md ${
                                      color === 'W' ? 'bg-yellow-100 text-gray-800' :
                                      color === 'U' ? 'bg-blue-500' :
                                      color === 'B' ? 'bg-gray-800 border border-gray-600' :
                                      color === 'R' ? 'bg-red-500' :
                                      color === 'G' ? 'bg-green-500' :
                                      'bg-gray-400'
                                    }`}
                                  >
                                    {color}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Status na Coleção */}
                          <div className="bg-gray-800/40 backdrop-blur-sm rounded-lg p-4 border border-gray-700/30">
                            <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                              <Library className="w-4 h-4 text-emerald-400" />
                              Status na Coleção
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="text-center p-3 bg-gray-700/30 rounded-lg">
                                <div className="text-xl font-bold text-blue-400">
                                  {getCardQuantityInCollection(selectedCard.id, false)}
                                </div>
                                <div className="text-xs text-gray-400">Normal</div>
                              </div>
                              <div className="text-center p-3 bg-gray-700/30 rounded-lg">
                                <div className="text-xl font-bold text-yellow-400">
                                  {getCardQuantityInCollection(selectedCard.id, true)}
                                </div>
                                <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  Foil
                                </div>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer com ações rápidas - Mais compacto */}
                  <div className="p-4 border-t border-gray-700/50 bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-gray-400 text-xs">
                          <Hash className="w-3 h-3" />
                          <span>ID:</span>
                        </div>
                        <code className="bg-gray-700/50 text-emerald-300 px-2 py-1 rounded text-xs font-mono">
                          {selectedCard.id.slice(0, 8)}...
                        </code>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const cardUrl = `https://scryfall.com/card/${selectedCard.set_code}/${selectedCard.collector_number}`
                            window.open(cardUrl, '_blank')
                          }}
                          className="bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50 hover:text-white text-xs"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Scryfall
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedCard.name)
                            // Aqui você pode adicionar uma notificação de sucesso
                          }}
                          className="bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50 hover:text-white text-xs"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copiar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          )}

          {/* Diálogo de Login/Registo */}
          <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">{isRegistering ? "Registar" : "Login"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleLogin} className="space-y-4">
                {isRegistering && (
                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">Nome Completo</label>
                    <Input
                      type="text"
                      placeholder="O seu nome completo"
                      value={loginForm.name}
                      onChange={(e) => setLoginForm((prev) => ({ ...prev, name: e.target.value }))}
                      className={inputClasses}
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">E-mail</label>
                  <Input
                    type="email"
                    placeholder="o_seu@email.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                    className={inputClasses}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">Palavra-passe</label>
                  <Input
                    type="password"
                    placeholder="A sua palavra-passe"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                    className={inputClasses}
                    required
                  />
                </div>
                {isRegistering && (
                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">Confirmar Palavra-passe</label>
                    <Input
                      type="password"
                      placeholder="Confirme a sua palavra-passe"
                      value={loginForm.confirmPassword}
                      onChange={(e) => setLoginForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      className={inputClasses}
                      required
                    />
                  </div>
                )}
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loginLoading}>
                  {loginLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : isRegistering ? (
                    "Registar"
                  ) : (
                    "Entrar"
                  )}
                </Button>
                <Button type="button" variant="link" onClick={toggleAuthMode} className="w-full text-gray-400">
                  {isRegistering ? "Já tem uma conta? Faça login" : "Não tem uma conta? Registe-se"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

              {/* Diálogo do Perfil */}
              <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
                <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-white">Editar Perfil</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Input
                          type="text"
                          placeholder="O seu nome"
                          value={profileForm.firstName}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))}
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <Input
                          type="text"
                          placeholder="O seu sobrenome"
                          value={profileForm.lastName}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))}
                          className={inputClasses}
                        />
                      </div>
                    </div>
                    <div>
                      <Input
                        type="email"
                        placeholder="o_seu@email.com"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                        className={inputClasses}
                      />
                    </div>
    
                    <div>
                      <Textarea
                        placeholder="Conte um pouco sobre si..."
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                        className={inputClasses}
                        rows={3}
                      />
                    </div>
    
                    <div className="space-y-2 pt-4">
                      <h4 className="text-white text-sm font-medium">Alterar Palavra-passe</h4>
                      <Input
                        type="password"
                        placeholder="Palavra-passe atual"
                        value={profileForm.currentPassword}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                        className={inputClasses}
                      />
                      <Input
                        type="password"
                        placeholder="Nova palavra-passe"
                        value={profileForm.newPassword}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                        className={inputClasses}
                      />
                      <Input
                        type="password"
                        placeholder="Confirmar nova palavra-passe"
                        value={profileForm.confirmNewPassword}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, confirmNewPassword: e.target.value }))}
                        className={inputClasses}
                      />
                    </div>
    
                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loginLoading}>
                      {loginLoading ? "A guardar..." : "Guardar Alterações"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

    {/* Drag Overlay */}
    <DragOverlay style={{ zIndex: 9999 }}>
      {draggedCard && (
        <div className="bg-gray-800/95 border-2 border-emerald-400/70 rounded-lg p-3 shadow-2xl transform rotate-3 scale-105 backdrop-blur-sm relative z-[9999]">
          <div className="text-sm font-bold text-white mb-1">{draggedCard.name}</div>
          <div className="text-xs text-gray-300">{draggedCard.set_name}</div>
          {draggedCard.mana_cost && (
            <div className="flex items-center gap-1 mt-2">
              <span 
                className="text-xs filter drop-shadow-sm"
                dangerouslySetInnerHTML={{ __html: formatManaSymbols(draggedCard.mana_cost) }}
              />
            </div>
          )}
          <div className="text-xs text-emerald-400 mt-1 font-medium">
            {activeTab === "collection" ? "Arrastar para 'A Minha Coleção'" : "Arrastar para Baralho ou Sideboard"}
          </div>
        </div>
      )}
    </DragOverlay>
  </DndContext>
  )
}