'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, ChevronDown, X } from 'lucide-react';
import { TokenSelectProps, Token } from './types';
import { TrendIndicator } from '@/components/shared/TrendIndicator';

/**
 * TokenSelect component for searching and selecting tokens
 * 
 * Follows the UX pattern guidelines for token selection:
 * - Search functionality with filtering
 * - Token metadata display (logo, name, symbol)
 * - Recently used tokens for quick access
 * - Clear feedback on selection
 */
export function TokenSelect({
  tokens,
  selectedToken,
  onSelectToken,
  isLoading = false,
  error,
  recentTokens = [],
  placeholder = 'Search by name or address'
}: TokenSelectProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [filteredTokens, setFilteredTokens] = useState<Token[]>(tokens);

  // Filter tokens when search query or tokens list changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTokens(tokens);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = tokens.filter(token => 
      token.name.toLowerCase().includes(query) || 
      token.symbol.toLowerCase().includes(query) ||
      token.id.toLowerCase().includes(query)
    );
    
    setFilteredTokens(filtered);
  }, [searchQuery, tokens]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSelectToken = (token: Token) => {
    onSelectToken(token);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectToken(null);
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="token-search" className="text-base">Select Token</Label>
      
      <div className="relative">
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between h-14 px-4"
              aria-label="Select a token"
            >
              {selectedToken ? (
                <div className="flex items-center">
                  <Avatar className="w-8 h-8 mr-3">
                    <AvatarImage src={selectedToken.logoUrl} alt={selectedToken.name} />
                    <AvatarFallback>{selectedToken.symbol.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className="text-base">{selectedToken.name} ({selectedToken.symbol})</span>
                  {selectedToken && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="ml-2 h-7 w-7" 
                      onClick={handleClearSelection}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <span className="flex items-center text-base">
                  <Search className="mr-2 h-5 w-5 opacity-50" />
                  Select Token
                </span>
              )}
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[330px] p-3" align="start">
            <div className="p-2">
              <Input
                id="token-search"
                placeholder={placeholder}
                value={searchQuery}
                onChange={handleSearch}
                className="mb-3 h-12 text-base"
                autoComplete="off"
              />
              
              {recentTokens.length > 0 && searchQuery === '' && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Recently Used
                  </p>
                  <div className="space-y-1">
                    {recentTokens.map((token) => (
                      <TokenListItem 
                        key={`recent-${token.id}`}
                        token={token}
                        onSelect={() => handleSelectToken(token)}
                      />
                    ))}
                  </div>
                  <div className="my-2 border-t" />
                </div>
              )}
              
              {isLoading ? (
                <div className="py-6 flex items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                </div>
              ) : error ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {error}
                </div>
              ) : filteredTokens.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No tokens found
                </div>
              ) : (
                <div className="max-h-[300px] overflow-auto">
                  {filteredTokens.map((token) => (
                    <TokenListItem 
                      key={token.id}
                      token={token}
                      onSelect={() => handleSelectToken(token)}
                    />
                  ))}
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {selectedToken && (
        <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-secondary">
          <Avatar className="w-8 h-8">
            <AvatarImage src={selectedToken.logoUrl} alt={selectedToken.name} />
            <AvatarFallback>{selectedToken.symbol.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{selectedToken.name}</div>
            <div className="text-xs text-muted-foreground">{selectedToken.symbol}</div>
          </div>
          {selectedToken.priceChangePercent24h !== undefined && (
            <div className="ml-auto">
              <TrendIndicator value={selectedToken.priceChangePercent24h} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper component for rendering token items in the dropdown
function TokenListItem({ token, onSelect }: { token: Token, onSelect: () => void }) {
  return (
    <DropdownMenuItem
      className="py-3 cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          <Avatar className="w-8 h-8 mr-3">
            <AvatarImage src={token.logoUrl} alt={token.name} />
            <AvatarFallback>{token.symbol.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-base">{token.name}</div>
            <div className="text-sm text-muted-foreground">{token.symbol}</div>
          </div>
        </div>
        {parseFloat(token.priceChange24h || '0') !== undefined && (
          <TrendIndicator value={parseFloat(token.priceChange24h || '0')} />
        )}
      </div>
    </DropdownMenuItem>
  );
}