import { ExternalLink } from "lucide-react";

export const renderSocialLink = (value: any, row: any) => {
    if (!value) return value;
    const url = value.startsWith('http') ? value : `https://${value}`;
    return (
      <div className="flex items-center w-full" onClick={(e) => e.stopPropagation()}>
        <span className="text-[#33B9B0] truncate">{value}</span>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[#33B9B0] hover:text-[#2aa39b] ml-1"
          onClick={(e) => {
            e.stopPropagation();
            window.open(url, '_blank');
          }}
        >
          <ExternalLink size={14} />
        </a>
      </div>
    );
};


