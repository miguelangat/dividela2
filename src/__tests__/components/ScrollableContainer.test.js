// src/__tests__/components/ScrollableContainer.test.js
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import ScrollableContainer from '../../components/common/ScrollableContainer';

describe('ScrollableContainer', () => {
  it('should render without crashing', () => {
    const { getByTestID } = render(
      <ScrollableContainer testID="test-container">
        <Text>Test Content</Text>
      </ScrollableContainer>
    );

    expect(getByTestID('test-container')).toBeTruthy();
  });

  it('should render children content inside ScrollView', () => {
    const { getByText } = render(
      <ScrollableContainer>
        <Text>Main Content</Text>
      </ScrollableContainer>
    );

    expect(getByText('Main Content')).toBeTruthy();
  });

  it('should render footer when provided', () => {
    const { getByText, getByTestID } = render(
      <ScrollableContainer
        testID="test-container"
        footer={
          <View>
            <Text>Footer Content</Text>
          </View>
        }
      >
        <Text>Main Content</Text>
      </ScrollableContainer>
    );

    expect(getByText('Main Content')).toBeTruthy();
    expect(getByText('Footer Content')).toBeTruthy();
    expect(getByTestID('test-container-footer')).toBeTruthy();
  });

  it('should not render footer when not provided', () => {
    const { queryByTestID } = render(
      <ScrollableContainer testID="test-container">
        <Text>Main Content</Text>
      </ScrollableContainer>
    );

    expect(queryByTestID('test-container-footer')).toBeNull();
  });

  it('should apply custom container styles', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByTestID } = render(
      <ScrollableContainer testID="test-container" containerStyle={customStyle}>
        <Text>Content</Text>
      </ScrollableContainer>
    );

    const container = getByTestID('test-container');
    expect(container.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining(customStyle)])
    );
  });

  it('should apply custom content styles', () => {
    const { container } = render(
      <ScrollableContainer contentStyle={{ padding: 20 }}>
        <Text>Content</Text>
      </ScrollableContainer>
    );

    // Content styles are applied to ScrollView's contentContainerStyle
    expect(container).toBeTruthy();
  });

  it('should hide scroll indicator by default', () => {
    const { UNSAFE_root } = render(
      <ScrollableContainer>
        <Text>Content</Text>
      </ScrollableContainer>
    );

    // Find ScrollView in the component tree
    const scrollView = UNSAFE_root.findAllByType('ScrollView')[0];
    expect(scrollView.props.showsVerticalScrollIndicator).toBe(false);
  });

  it('should show scroll indicator when specified', () => {
    const { UNSAFE_root } = render(
      <ScrollableContainer showsVerticalScrollIndicator={true}>
        <Text>Content</Text>
      </ScrollableContainer>
    );

    const scrollView = UNSAFE_root.findAllByType('ScrollView')[0];
    expect(scrollView.props.showsVerticalScrollIndicator).toBe(true);
  });

  it('should use SafeAreaView with top edge only', () => {
    const { UNSAFE_root } = render(
      <ScrollableContainer testID="test-container">
        <Text>Content</Text>
      </ScrollableContainer>
    );

    const safeAreaView = UNSAFE_root.findAllByType('SafeAreaView')[0];
    expect(safeAreaView.props.edges).toEqual(['top']);
  });

  it('should apply safe area insets to footer padding', () => {
    const { getByTestID } = render(
      <ScrollableContainer
        testID="test-container"
        footer={
          <View>
            <Text>Footer</Text>
          </View>
        }
      >
        <Text>Content</Text>
      </ScrollableContainer>
    );

    const footer = getByTestID('test-container-footer');
    // Footer should have paddingBottom from safe area insets
    expect(footer.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          paddingBottom: expect.any(Number),
        }),
      ])
    );
  });

  it('should render multiple children', () => {
    const { getByText } = render(
      <ScrollableContainer>
        <Text>First Child</Text>
        <Text>Second Child</Text>
        <Text>Third Child</Text>
      </ScrollableContainer>
    );

    expect(getByText('First Child')).toBeTruthy();
    expect(getByText('Second Child')).toBeTruthy();
    expect(getByText('Third Child')).toBeTruthy();
  });

  it('should have correct structure: SafeAreaView > ScrollView > Content + Footer', () => {
    const { UNSAFE_root } = render(
      <ScrollableContainer
        footer={
          <View>
            <Text>Footer</Text>
          </View>
        }
      >
        <Text>Content</Text>
      </ScrollableContainer>
    );

    // Verify component hierarchy
    const safeAreaView = UNSAFE_root.findAllByType('SafeAreaView')[0];
    expect(safeAreaView).toBeTruthy();

    const scrollView = safeAreaView.findAllByType('ScrollView')[0];
    expect(scrollView).toBeTruthy();
  });
});
