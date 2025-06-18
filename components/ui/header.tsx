"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Settings,
  LogOut,
  Shuffle,
  Crown,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  isAuthenticated: boolean
  currentUser: {
    id: string
    name: string
    email: string
    firstName?: string
    lastName?: string
    avatar?: string
    bio?: string
  } | null
  onLogin: () => void
  onLogout: () => void
  onProfile: () => void
  onRandomBackground: () => void
  isLoadingBackground: boolean
}

export default function Header({
  isAuthenticated,
  currentUser,
  onLogin,
  onLogout,
  onProfile,
  onRandomBackground,
  isLoadingBackground
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="relative">
      {/* Main Header Bar */}
      <div className="bg-gray-900/95 backdrop-blur-lg border-b border-gray-700/50 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo/Brand */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  MTG Collection
                </h1>
                <p className="text-xs text-gray-400 -mt-1">
                  Gestor de Coleções
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              
              {/* Random Background Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onRandomBackground}
                disabled={isLoadingBackground}
                className="text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all duration-200"
              >
                <Shuffle className={`w-4 h-4 mr-2 ${isLoadingBackground ? 'animate-spin' : ''}`} />
                <span className="hidden lg:inline">Fundo Aleatório</span>
                <span className="lg:hidden">Fundo</span>
              </Button>

              {/* Authentication Section */}
              {isAuthenticated && currentUser ? (
                <div className="flex items-center space-x-3">
                  {/* User Stats Badge */}
                  <Badge 
                    variant="outline" 
                    className="border-gray-600 text-gray-300 bg-gray-800/50 backdrop-blur-sm hidden lg:flex"
                  >
                    Bem-vindo, {currentUser.firstName || currentUser.name.split(' ')[0]}
                  </Badge>

                  {/* User Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="relative h-10 w-10 rounded-full ring-2 ring-transparent hover:ring-emerald-500/50 transition-all duration-200"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage 
                            src={currentUser.avatar} 
                            alt={currentUser.name}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-semibold">
                            {getUserInitials(currentUser.name)}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      className="w-64 bg-gray-900/95 backdrop-blur-lg border-gray-700 shadow-xl" 
                      align="end"
                    >
                      {/* User Info Header */}
                      <div className="px-3 py-3 border-b border-gray-700">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage 
                              src={currentUser.avatar} 
                              alt={currentUser.name}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                              {getUserInitials(currentUser.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {currentUser.name}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {currentUser.email}
                            </p>
                          </div>
                        </div>
                        {currentUser.bio && (
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                            {currentUser.bio}
                          </p>
                        )}
                      </div>

                      {/* Menu Items */}
                      <DropdownMenuItem 
                        onClick={onProfile}
                        className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer"
                      >
                        <User className="mr-3 h-4 w-4" />
                        <span>Editar Perfil</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem 
                        className="text-gray-300 hover:text-white hover:bg-gray-700/50 cursor-pointer"
                      >
                        <Settings className="mr-3 h-4 w-4" />
                        <span>Configurações</span>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="bg-gray-700" />
                      
                      <DropdownMenuItem 
                        onClick={onLogout}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 cursor-pointer"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        <span>Terminar Sessão</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <Button
                  onClick={onLogin}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 transform hover:scale-105"
                >
                  <User className="w-4 h-4 mr-2" />
                  Entrar
                </Button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-300 hover:text-white hover:bg-gray-700/50"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 z-50 bg-gray-900/98 backdrop-blur-lg border-b border-gray-700/50 shadow-xl">
          <div className="container mx-auto px-4 py-4 space-y-4">
            
            {/* Mobile Brand */}
            <div className="flex items-center space-x-3 pb-4 border-b border-gray-700/50">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">MTG Collection</h1>
                <p className="text-xs text-gray-400 -mt-1">Gestor de Coleções</p>
              </div>
            </div>

            {/* Mobile Navigation */}
            <div className="space-y-2">
              
              {/* Random Background Button */}
              <Button
                variant="ghost"
                onClick={() => {
                  onRandomBackground()
                  setMobileMenuOpen(false)
                }}
                disabled={isLoadingBackground}
                className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700/50"
              >
                <Shuffle className={`w-4 h-4 mr-3 ${isLoadingBackground ? 'animate-spin' : ''}`} />
                Fundo Aleatório
              </Button>

              {/* Authentication Section */}
              {isAuthenticated && currentUser ? (
                <div className="space-y-2">
                  {/* User Info */}
                  <div className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage 
                        src={currentUser.avatar} 
                        alt={currentUser.name}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                        {getUserInitials(currentUser.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {currentUser.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>

                  {/* Profile Actions */}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      onProfile()
                      setMobileMenuOpen(false)
                    }}
                    className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700/50"
                  >
                    <User className="w-4 h-4 mr-3" />
                    Editar Perfil
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700/50"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    Configurações
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      onLogout()
                      setMobileMenuOpen(false)
                    }}
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Terminar Sessão
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    onLogin()
                    setMobileMenuOpen(false)
                  }}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
                >
                  <User className="w-4 h-4 mr-2" />
                  Entrar
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}