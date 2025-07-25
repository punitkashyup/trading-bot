"""
Strategy Factory for creating strategy instances
"""

from typing import Dict, Any, Optional
from app.core.strategies.base_strategy import BaseStrategy
from app.core.strategies.pva_strategy import PVAStrategy


class StrategyFactory:
    """Factory class for creating strategy instances"""
    
    # Registry of available strategies
    _strategies = {
        'PVA': PVAStrategy,
        'PRICE_VOLUME_ACTION': PVAStrategy,
    }
    
    @classmethod
    def create_strategy(
        cls, 
        strategy_id: str, 
        strategy_type: str, 
        config: Dict[str, Any]
    ) -> BaseStrategy:
        """
        Create a strategy instance based on strategy type
        
        Args:
            strategy_id: Unique identifier for the strategy
            strategy_type: Type of strategy to create (e.g., 'PVA')
            config: Configuration parameters for the strategy
            
        Returns:
            BaseStrategy: Instance of the requested strategy
            
        Raises:
            ValueError: If strategy type is not supported
        """
        
        strategy_type_upper = strategy_type.upper()
        
        if strategy_type_upper not in cls._strategies:
            available_types = list(cls._strategies.keys())
            raise ValueError(
                f"Unsupported strategy type: {strategy_type}. "
                f"Available types: {available_types}"
            )
        
        strategy_class = cls._strategies[strategy_type_upper]
        
        # Create strategy instance with provided config
        strategy_instance = strategy_class(
            strategy_id=strategy_id,
            config=config
        )
        
        return strategy_instance
    
    @classmethod
    def get_available_strategies(cls) -> Dict[str, str]:
        """
        Get list of available strategy types
        
        Returns:
            Dict[str, str]: Dictionary of strategy types and their descriptions
        """
        return {
            'PVA': 'Price Volume Action Strategy - Uses volume and price analysis for signal generation',
            'PRICE_VOLUME_ACTION': 'Price Volume Action Strategy (alias for PVA)',
        }
    
    @classmethod
    def register_strategy(cls, strategy_type: str, strategy_class: type):
        """
        Register a new strategy type
        
        Args:
            strategy_type: Name of the strategy type
            strategy_class: Strategy class that inherits from BaseStrategy
        """
        if not issubclass(strategy_class, BaseStrategy):
            raise ValueError(
                f"Strategy class {strategy_class.__name__} must inherit from BaseStrategy"
            )
        
        cls._strategies[strategy_type.upper()] = strategy_class
    
    @classmethod
    def validate_config(cls, strategy_type: str, config: Dict[str, Any]) -> bool:
        """
        Validate strategy configuration
        
        Args:
            strategy_type: Type of strategy
            config: Configuration to validate
            
        Returns:
            bool: True if config is valid
        """
        strategy_type_upper = strategy_type.upper()
        
        if strategy_type_upper not in cls._strategies:
            return False
        
        # Basic validation - ensure required fields exist
        required_fields = ['capital', 'max_position_size']
        
        for field in required_fields:
            if field not in config:
                return False
        
        # Validate capital is positive
        if config.get('capital', 0) <= 0:
            return False
        
        # Validate max_position_size is positive
        if config.get('max_position_size', 0) <= 0:
            return False
        
        return True